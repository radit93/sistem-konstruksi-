<?php

namespace App\Services;

use App\Models\BillOfMaterial;
use App\Models\Drawing;
use App\Models\LineService;
use App\Models\MaterialStandard;
use App\Models\PipeSchedule;
use App\Models\FittingStandard;
use App\Models\PipingClassTemplate;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Otomasi MTO / Bill of Material dari isometrik drawing berdasarkan Line Service
 * dan Piping Class. Template komponen disimpan pada tabel piping_class_templates.
 */
class AutoBomService
{
    /**
     * Template bawaan bila piping class belum punya master komponen.
     *
     * @var array<int, array<string, string|float>>
     */
    private const DEFAULT_TEMPLATES = [
        [
            'piping_class' => 'A1A',
            'component_type' => 'Pipe',
            'description' => 'Pipe Seamless BE ASTM A106 Gr. B',
            'default_rating_sch' => 'Sch 40',
            'material_spec' => 'ASTM A106 Gr. B',
            'unit' => 'meter',
            'ratio_formula' => 1.2,
            'basis' => 'PER_DI',
        ],
        [
            'piping_class' => 'A1A',
            'component_type' => 'Elbow 90 LR',
            'description' => 'Elbow 90 Deg Long Radius BW ASTM A234 WPB',
            'default_rating_sch' => 'Sch 40',
            'material_spec' => 'ASTM A234 WPB',
            'unit' => 'buah',
            'ratio_formula' => 1.0,
            'basis' => 'PER_JOINT',
        ],
        [
            'piping_class' => 'A1A',
            'component_type' => 'Flange WN',
            'description' => 'Flange Weld Neck RF Class 150# ASTM A105',
            'default_rating_sch' => '150# Sch 40',
            'material_spec' => 'ASTM A105',
            'unit' => 'buah',
            'ratio_formula' => 0.25,
            'basis' => 'PER_JOINT',
        ],
        [
            'piping_class' => 'A1A',
            'component_type' => 'Gasket',
            'description' => 'Spiral Wound Gasket SS316L / Graphite 150#',
            'default_rating_sch' => '150#',
            'material_spec' => 'SS316L / Graphite',
            'unit' => 'buah',
            'ratio_formula' => 0.25,
            'basis' => 'PER_JOINT',
        ],
        [
            'piping_class' => 'A1A',
            'component_type' => 'Stud Bolt',
            'description' => 'Stud Bolt with 2 Heavy Hex Nuts ASTM A193 B7',
            'default_rating_sch' => 'UNC',
            'material_spec' => 'ASTM A193 B7 / A194 2H',
            'unit' => 'set',
            'ratio_formula' => 1.0,
            'basis' => 'PER_JOINT',
        ],
    ];

    /**
     * Generate (atau generate ulang) BOM draft untuk satu isometrik drawing.
     *
     * @return Collection<int, BillOfMaterial>
     *
     * @throws ValidationException
     */
    public function generateForDrawing(Drawing $drawing): Collection
    {
        $pipingClass = $this->resolvePipingClass($drawing);
        $templates = $this->templatesFor($pipingClass);
        $diaInch = max(1.0, (float) ($drawing->total_dia_inch ?? 0));
        $joints = max(1, (int) ($drawing->total_joints ?? 0));
        $size = $drawing->size_range ?: '4"';
        $standards = MaterialStandard::query()->get();

        return DB::transaction(function () use ($drawing, $templates, $diaInch, $joints, $size, $standards) {
            $previous = BillOfMaterial::query()
                ->where('drawing_id', $drawing->id)
                ->where('source', 'GENERATED')
                ->get();

            if ($previous->contains(fn (BillOfMaterial $bom): bool => $bom->issuings()->exists())) {
                throw ValidationException::withMessages([
                    'drawing' => 'BOM hasil generate pada drawing ini sudah dipakai untuk pengeluaran material. Batalkan pengeluaran terkait sebelum generate ulang.',
                ]);
            }

            if ($previous->isNotEmpty()) {
                BillOfMaterial::whereKey($previous->modelKeys())->delete();
            }

            $itemNo = 0;
            $generated = collect();

            foreach ($templates as $template) {
                $itemNo++;

                $qty = match ($template->basis) {
                    'PER_DI' => $diaInch * (float) $template->ratio_formula,
                    'PER_JOINT' => $joints * (float) $template->ratio_formula,
                    default => (float) $template->ratio_formula,
                };
                $qty = round(max($qty, 0.01), 2);

                $unitPrice = match (true) {
                    stripos($template->component_type, 'pipe') !== false => 320000,
                    stripos($template->component_type, 'elbow') !== false => 185000,
                    stripos($template->component_type, 'flange') !== false => 295000,
                    stripos($template->component_type, 'gasket') !== false => 75000,
                    stripos($template->component_type, 'bolt') !== false => 45000,
                    default => 100000,
                };
                $totalPrice = round($qty * $unitPrice, 2);

                $row = [
                    'project_id' => $drawing->project_id,
                    'drawing_id' => $drawing->id,
                    'material_standard_id' => $template->material_standard_id
                        ?: $this->resolveStandardId($standards, $template),
                    'spool_no' => 'SP-01',
                    'item_no' => (string) $itemNo,
                    'component_type' => $template->component_type,
                    'description' => $template->description,
                    'size' => $size,
                    'rating_sch' => $template->default_rating_sch,
                    'material_spec' => $template->material_spec,
                    'qty' => $qty,
                    'unit' => $template->unit,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'tag_number' => $this->tagNumber($template->component_type, $itemNo),
                    'department_id' => $drawing->department_id,
                    'source' => 'GENERATED',
                ];

                $row = PipeSchedule::enrichBom($row);
                $row = FittingStandard::enrichBom($row);
                $generated->push(BillOfMaterial::create($row));
            }

            return $generated;
        });
    }

    /**
     * Piping class diambil dari Line Service yang cocok dengan nomor line drawing.
     */
    public function resolvePipingClass(Drawing $drawing): string
    {
        $lineNo = trim((string) $drawing->line_no);

        if ($lineNo !== '') {
            $lineService = LineService::query()
                ->where('line_no', $lineNo)
                ->first()
                ?? LineService::query()->where('line_no', 'like', "%{$lineNo}%")->first();

            if ($lineService?->piping_class) {
                return $lineService->piping_class;
            }
        }

        return 'A1A';
    }

    /**
     * @return Collection<int, PipingClassTemplate>
     */
    private function templatesFor(string $pipingClass): Collection
    {
        $classKey = Str::of($pipingClass)->before('(')->trim()->upper()->value() ?: 'A1A';

        $templates = PipingClassTemplate::query()
            ->where('piping_class', $classKey)
            ->orderBy('id')
            ->get();

        if ($templates->isNotEmpty()) {
            return $templates;
        }

        return collect(self::DEFAULT_TEMPLATES)->map(
            fn (array $template): PipingClassTemplate => new PipingClassTemplate($template)
        );
    }

    /**
     * Cocokkan komponen ke material standard agar BOM hasil generate langsung
     * terhubung ke master material dan bisa direkonsiliasi dengan stok.
     *
     * @param  Collection<int, MaterialStandard>  $standards
     */
    private function resolveStandardId(Collection $standards, PipingClassTemplate $template): ?int
    {
        $category = $this->standardCategory($template->component_type);
        $spec = mb_strtolower(trim((string) $template->material_spec));

        $candidates = $standards->filter(
            fn (MaterialStandard $standard): bool => strcasecmp($standard->category, $category) === 0
        );

        if ($candidates->isEmpty() || $spec === '') {
            return null;
        }

        $exact = $candidates->first(
            fn (MaterialStandard $standard): bool => mb_strtolower(trim((string) $standard->specification)) === $spec
        );

        if ($exact) {
            return $exact->id;
        }

        return $candidates->first(
            fn (MaterialStandard $standard): bool => $spec !== ''
                && Str::contains(mb_strtolower((string) $standard->specification), $spec)
        )?->id;
    }

    private function standardCategory(string $componentType): string
    {
        $type = mb_strtolower($componentType);

        return match (true) {
            str_contains($type, 'pipe') => 'Pipe',
            str_contains($type, 'flange') => 'Flange',
            str_contains($type, 'gasket') => 'Gasket',
            str_contains($type, 'bolt') => 'Fastener',
            str_contains($type, 'valve') => 'Valve',
            default => 'Fitting',
        };
    }

    private function tagNumber(string $componentType, int $sequence): string
    {
        $prefix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $componentType) ?: 'ITM', 0, 3));

        return $prefix.'-'.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT);
    }
}
