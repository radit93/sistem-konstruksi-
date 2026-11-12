<?php

namespace App\Services;

use App\Models\Drawing;
use App\Models\EngineeringBoq;
use App\Models\PipeStandard;
use App\Models\Project;
use App\Models\WeldingMap;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BoqSyncService
{
    /**
     * Tarif standar industri jasa las & fabrikasi per Dia-Inch (Rupiah).
     */
    public const RATE_SHOP_CS = 55000;
    public const RATE_FIELD_CS = 85000;
    public const RATE_SHOP_SS = 110000;
    public const RATE_FIELD_SS = 165000;

    /**
     * Sinkronkan item BOQ Engineering dari data aktual Welding Map per Drawing atau Project.
     *
     * @return Collection<int, EngineeringBoq>
     */
    public function sync(int $projectId, ?int $drawingId = null, ?int $departmentId = null): Collection
    {
        $query = WeldingMap::query()->where('project_id', $projectId);
        if ($drawingId) {
            $query->where('drawing_id', $drawingId);
        }

        $joints = $query->get();
        if ($joints->isEmpty()) {
            return collect();
        }

        $drawing = $drawingId ? Drawing::find($drawingId) : Drawing::where('project_id', $projectId)->first();
        $lineNo = $drawing?->line_no ?: ($joints->first()->line_no ?? '15-MPP-AB');

        // Cache Master Pipe untuk pencarian tebal, OD, dan bobot
        $pipeStandards = PipeStandard::all();

        return DB::transaction(function () use ($joints, $projectId, $drawingId, $drawing, $lineNo, $departmentId, $pipeStandards) {
            // Hapus BOQ lama yang disinkronkan dari drawing/project ini jika ada
            $deleteQuery = EngineeringBoq::where('project_id', $projectId);
            if ($drawingId) {
                $deleteQuery->where('drawing_id', $drawingId);
            }
            $deleteQuery->delete();

            $syncedItems = collect();

            // Pisahkan Shop vs Field
            $groups = [
                'Shop' => [
                    'code' => 'BOQ-ENG-FAB-01',
                    'scope' => 'Workshop Spool Fabrication',
                    'joints' => $joints->filter(fn ($j) => strcasecmp($j->location ?? 'Shop', 'Field') !== 0),
                ],
                'Field' => [
                    'code' => 'BOQ-ENG-ERE-01',
                    'scope' => 'Field Installation & Erection',
                    'joints' => $joints->filter(fn ($j) => strcasecmp($j->location ?? '', 'Field') === 0),
                ],
            ];

            foreach ($groups as $loc => $data) {
                $locJoints = $data['joints'];
                if ($locJoints->isEmpty()) {
                    continue;
                }

                $diaInchTotal = 0.0;
                $weightTotal = 0.0;
                $weldingCostTotal = 0.0;
                $spools = [];
                $materialGroups = [];

                foreach ($locJoints as $j) {
                    $diaInchTotal += (float) ($j->dia_inch ?: 0);
                    if ($j->spool_no) {
                        $spools[$j->spool_no] = true;
                    }

                    $matGroup = $j->mat_a_group ?: 'Carbon Steel';
                    $materialGroups[$matGroup] = true;

                    // Hitung bobot dan biaya elektroda dari PipeStandard
                    $pipeStd = $this->findPipeStandard($pipeStandards, $j->mat_a_size ?: $j->size, $j->mat_a_sch ?: $j->thickness);
                    if ($pipeStd) {
                        $thk = (float) $pipeStd->wall_thickness_mm;
                        $od = (float) $pipeStd->outer_diameter_mm;
                        if ($thk > 0 && $od > 0) {
                            $weldingCostTotal += round($thk * $od * 1.2 * 50, 0);
                        }

                        $lengthMm = (float) ($j->length_mm ?: 0);
                        $wtPerM = (float) ($pipeStd->weight_kg_m ?: 0);
                        if ($lengthMm > 0 && $wtPerM > 0) {
                            $weightTotal += ($wtPerM * $lengthMm) / 1000.0;
                        }
                    }
                }

                // Tentukan grup material dominan
                $isSs = collect(array_keys($materialGroups))->contains(fn ($g) => stripos($g, 'stainless') !== false);
                $matGroupLabel = $isSs ? 'Stainless Steel' : 'Carbon Steel';

                // Tentukan rate per DI
                $ratePerDi = match (true) {
                    $loc === 'Shop' && $isSs => self::RATE_SHOP_SS,
                    $loc === 'Shop' => self::RATE_SHOP_CS,
                    $loc === 'Field' && $isSs => self::RATE_FIELD_SS,
                    default => self::RATE_FIELD_CS,
                };

                $totalAmount = round(($diaInchTotal * $ratePerDi) + $weldingCostTotal, 2);

                $boq = EngineeringBoq::create([
                    'project_id' => $projectId,
                    'drawing_id' => $drawingId,
                    'line_no' => $lineNo,
                    'item_code' => $data['code'],
                    'work_scope' => "{$data['scope']} ({$matGroupLabel})",
                    'material_group' => $matGroupLabel,
                    'dia_inch_total' => round($diaInchTotal, 2),
                    'rate_per_di' => $ratePerDi,
                    'joints_count' => $locJoints->count(),
                    'spools_count' => count($spools),
                    'weight_kg' => round($weightTotal, 2),
                    'welding_cost_total' => round($weldingCostTotal, 2),
                    'total_amount' => $totalAmount,
                    'status' => 'APPROVED',
                    'department_id' => $departmentId,
                ]);

                $syncedItems->push($boq);
            }

            return $syncedItems;
        });
    }

    private function findPipeStandard(Collection $standards, ?string $size, ?string $schedule): ?PipeStandard
    {
        if (! $size) {
            return null;
        }

        $normSize = trim(str_replace(['"', ' '], '', $size));
        $normSch = $schedule ? trim(preg_replace('/\b(sch|schedule)\b/i', '', $schedule)) : '';

        return $standards->first(function (PipeStandard $p) use ($normSize, $normSch) {
            $pSize = trim(str_replace(['"', ' '], '', $p->nps));
            if ($pSize !== $normSize) {
                return false;
            }
            if ($normSch !== '') {
                $pSch = trim(preg_replace('/\b(sch|schedule)\b/i', '', $p->schedule));
                return strcasecmp($pSch, $normSch) === 0;
            }
            return true;
        });
    }
}
