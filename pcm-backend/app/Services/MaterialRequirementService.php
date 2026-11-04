<?php

namespace App\Services;

use App\Models\BillOfMaterial;
use App\Models\MaterialIssuing;
use App\Models\MaterialReceiving;
use App\Models\MaterialStoring;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Rekonsiliasi kebutuhan material dari Engineering BOM terhadap realisasi
 * Material Control: issued per spool, stok tersedia, dan barang diterima.
 *
 * Pencocokan utama memakai material_standard_id. Data lama yang belum punya
 * kode standar dicocokkan dengan kunci teks (spesifikasi + ukuran + satuan)
 * sebagai fallback best effort.
 */
class MaterialRequirementService
{
    /**
     * @param  array{project_id?: int|null, drawing_id?: int|null, spool_no?: string|null, status?: string|null, search?: string|null}  $filters
     * @return array{summary: array<string, int|float>, rows: array<int, array<string, mixed>>}
     */
    public function summarize(
        Builder $bomQuery,
        Builder $issuingQuery,
        Builder $stockQuery,
        Builder $receivingQuery,
        array $filters = []
    ): array {
        $boms = $this->applyBomFilters($bomQuery, $filters)->get();

        if ($boms->isEmpty()) {
            return ['summary' => $this->emptySummary(), 'rows' => []];
        }

        $bomIds = $boms->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $drawingIds = $boms->pluck('drawing_id')->filter()->unique()->map(fn ($id): int => (int) $id)->all();
        $spoolNos = $boms->pluck('spool_no')->filter()->unique()->values()->all();
        $projectIds = $boms->pluck('project_id')->filter()->unique()->map(fn ($id): int => (int) $id)->all();

        $issuings = $this->applyIssuingFilters($issuingQuery, $bomIds, $drawingIds, $spoolNos, $projectIds, $filters)->get();
        $storings = $this->applyMaterialScope($stockQuery, $projectIds, $filters)
            ->where('status', '!=', 'VOID')
            ->get();
        $receivings = $this->applyMaterialScope($receivingQuery, $projectIds, $filters)
            ->where('status', 'ACCEPTED')
            ->get();

        [$groups, $groupByBom, $fallbackIndex] = $this->groupRequirements($boms);

        $this->allocateIssuings($issuings, $groups, $groupByBom, $fallbackIndex);

        $stockByIdentity = $this->sumByIdentity(
            $storings,
            fn (MaterialStoring $stock): string => $this->storingIdentity($stock),
            fn (MaterialStoring $stock): float => (float) $stock->balance
        );

        $receivedByIdentity = $this->sumByIdentity(
            $receivings,
            fn (MaterialReceiving $receiving): string => $this->receivingIdentity($receiving),
            fn (MaterialReceiving $receiving): float => (float) ($receiving->accepted_qty ?? $receiving->qty)
        );

        $rows = [];

        foreach ($groups as $group) {
            $required = round((float) $group['required_qty'], 2);
            $issued = round((float) $group['issued_qty'], 2);
            $remaining = max(0, round($required - $issued, 2));
            $surplus = max(0, round($issued - $required, 2));
            $identity = (string) $group['identity'];
            $stockBalance = round($stockByIdentity[$identity] ?? 0, 2);
            $received = round($receivedByIdentity[$identity] ?? 0, 2);
            $status = $issued + 0.0001 >= $required ? 'FULFILLED' : 'SHORTAGE';
            $statusFilter = $filters['status'] ?? null;

            if ($statusFilter && $statusFilter !== 'ALL' && $statusFilter !== $status) {
                continue;
            }

            $rows[] = [
                'key' => $group['key'],
                'drawing_id' => $group['drawing_id'],
                'drawing_no' => $group['drawing_no'],
                'spool_no' => $group['spool_no'],
                'material_standard_id' => $group['material_standard_id'],
                'standard_code' => $group['standard_code'],
                'component_type' => $group['component_type'],
                'description' => $group['description'],
                'specification' => $group['specification'],
                'size' => $group['size'],
                'unit' => $group['unit'],
                'required_qty' => $required,
                'issued_qty' => $issued,
                'remaining_qty' => $remaining,
                'surplus_qty' => $surplus,
                'received_qty' => $received,
                'stock_balance' => $stockBalance,
                'bom_lines' => $group['bom_lines'],
                'bom_ids' => $group['bom_ids'],
                'status' => $status,
                'procurement' => $stockBalance + 0.0001 >= $remaining ? 'STOCK_READY' : 'TO_PROCURE',
            ];
        }

        usort($rows, function (array $a, array $b): int {
            return [$a['status'] === 'SHORTAGE' ? 0 : 1, (string) $a['drawing_no'], (string) $a['spool_no'], (string) $a['description']]
                <=> [$b['status'] === 'SHORTAGE' ? 0 : 1, (string) $b['drawing_no'], (string) $b['spool_no'], (string) $b['description']];
        });

        return [
            'summary' => [
                'total_lines' => count($rows),
                'shortage_lines' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'SHORTAGE')),
                'fulfilled_lines' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'FULFILLED')),
                'to_procure_lines' => count(array_filter(
                    $rows,
                    fn (array $row): bool => $row['procurement'] === 'TO_PROCURE' && $row['remaining_qty'] > 0
                )),
                'required_qty' => round(array_sum(array_column($rows, 'required_qty')), 2),
                'issued_qty' => round(array_sum(array_column($rows, 'issued_qty')), 2),
                'stock_balance' => round(array_sum(array_values($stockByIdentity)), 2),
                'received_qty' => round(array_sum(array_values($receivedByIdentity)), 2),
            ],
            'rows' => $rows,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyBomFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->with(['materialStandard', 'drawing'])
            ->when(! empty($filters['project_id']), fn (Builder $q): Builder => $q->where('project_id', (int) $filters['project_id']))
            ->when(! empty($filters['drawing_id']), fn (Builder $q): Builder => $q->where('drawing_id', (int) $filters['drawing_id']))
            ->when(! empty($filters['spool_no']), fn (Builder $q): Builder => $q->where('spool_no', $filters['spool_no']))
            ->when(! empty($filters['search']), function (Builder $q) use ($filters): void {
                $search = (string) $filters['search'];

                $q->where(function (Builder $inner) use ($search): void {
                    $inner->where('description', 'like', "%{$search}%")
                        ->orWhere('component_type', 'like', "%{$search}%")
                        ->orWhere('material_spec', 'like', "%{$search}%")
                        ->orWhere('spool_no', 'like', "%{$search}%")
                        ->orWhere('tag_number', 'like', "%{$search}%")
                        ->orWhereHas('materialStandard', fn (Builder $standard): Builder => $standard->where('code', 'like', "%{$search}%"));
                });
            })
            ->orderBy('drawing_id')
            ->orderBy('spool_no')
            ->orderBy('item_no');
    }

    /**
     * @param  array<int, int>  $bomIds
     * @param  array<int, int>  $drawingIds
     * @param  array<int, string>  $spoolNos
     * @param  array<int, int>  $projectIds
     * @param  array<string, mixed>  $filters
     */
    private function applyIssuingFilters(
        Builder $query,
        array $bomIds,
        array $drawingIds,
        array $spoolNos,
        array $projectIds,
        array $filters
    ): Builder {
        $projectFilter = ! empty($filters['project_id'])
            ? [(int) $filters['project_id']]
            : $projectIds;

        return $query
            ->where('status', '!=', 'CANCELLED')
            ->where(function (Builder $q) use ($bomIds, $drawingIds, $spoolNos): void {
                $q->whereIn('bom_id', $bomIds);

                if ($drawingIds !== []) {
                    $q->orWhereIn('drawing_id', $drawingIds);
                }

                if ($spoolNos !== []) {
                    $q->orWhereIn('target_spool_no', $spoolNos);
                }
            })
            ->when($projectFilter !== [], fn (Builder $q): Builder => $q->whereIn('project_id', $projectFilter));
    }

    /**
     * @param  array<int, int>  $projectIds
     * @param  array<string, mixed>  $filters
     */
    private function applyMaterialScope(Builder $query, array $projectIds, array $filters): Builder
    {
        $projectFilter = ! empty($filters['project_id'])
            ? [(int) $filters['project_id']]
            : $projectIds;

        return $query->when(
            $projectFilter !== [],
            fn (Builder $q): Builder => $q->whereIn('project_id', $projectFilter)
        );
    }

    /**
     * @return array{0: array<string, array<string, mixed>>, 1: array<int, string>, 2: array<string, array<int, string>>}
     */
    private function groupRequirements(Collection $boms): array
    {
        $groups = [];
        $groupByBom = [];
        $fallbackIndex = [];

        foreach ($boms as $bom) {
            $identity = $this->bomIdentity($bom);
            $key = $this->drawingKey($bom->drawing_id, $bom->drawing?->drawing_no)
                .'|'.strtolower(trim((string) $bom->spool_no))
                .'|'.$identity;

            if (! isset($groups[$key])) {
                $groups[$key] = [
                    'key' => $key,
                    'identity' => $identity,
                    'drawing_id' => $bom->drawing_id,
                    'drawing_no' => $bom->drawing?->drawing_no,
                    'spool_no' => $bom->spool_no,
                    'material_standard_id' => $bom->material_standard_id,
                    'standard_code' => $bom->materialStandard?->code,
                    'component_type' => $bom->component_type,
                    'description' => $bom->description,
                    'specification' => $bom->material_spec,
                    'size' => $bom->size,
                    'unit' => $bom->unit,
                    'required_qty' => 0.0,
                    'issued_qty' => 0.0,
                    'bom_lines' => 0,
                    'bom_ids' => [],
                ];
            }

            $groups[$key]['required_qty'] = (float) $groups[$key]['required_qty'] + (float) $bom->qty;
            $groups[$key]['bom_lines'] = (int) $groups[$key]['bom_lines'] + 1;
            $groups[$key]['bom_ids'][] = (int) $bom->id;
            $groupByBom[(int) $bom->id] = $key;

            $drawingKeys = [$this->drawingKey($bom->drawing_id, $bom->drawing?->drawing_no)];

            if ($bom->drawing?->drawing_no) {
                $drawingKeys[] = 'no:'.strtolower(trim((string) $bom->drawing->drawing_no));
            }

            foreach (array_unique($drawingKeys) as $drawingKey) {
                $fallbackIndex[$drawingKey.'|'.$identity][] = $key;
            }
        }

        return [$groups, $groupByBom, $fallbackIndex];
    }

    /**
     * @param  Collection<int, MaterialIssuing>  $issuings
     * @param  array<string, array<string, mixed>>  $groups
     * @param  array<int, string>  $groupByBom
     * @param  array<string, array<int, string>>  $fallbackIndex
     */
    private function allocateIssuings(Collection $issuings, array &$groups, array $groupByBom, array $fallbackIndex): void
    {
        foreach ($issuings as $issuing) {
            $key = null;

            if ($issuing->bom_id && isset($groupByBom[(int) $issuing->bom_id])) {
                $key = $groupByBom[(int) $issuing->bom_id];
            } else {
                $identity = $this->issuingIdentity($issuing);
                $candidates = [];

                if ($issuing->drawing_id) {
                    $candidates = $fallbackIndex['id:'.$issuing->drawing_id.'|'.$identity] ?? [];
                }

                if ($candidates === [] && $issuing->drawing_no) {
                    $candidates = $fallbackIndex['no:'.strtolower(trim((string) $issuing->drawing_no)).'|'.$identity] ?? [];
                }

                if ($candidates !== []) {
                    $key = $this->pickGroup($candidates, $groups, $issuing);
                }
            }

            if ($key !== null && isset($groups[$key])) {
                $groups[$key]['issued_qty'] = (float) $groups[$key]['issued_qty'] + (float) $issuing->qty;
            }
        }
    }

    /**
     * @param  array<int, string>  $candidateKeys
     * @param  array<string, array<string, mixed>>  $groups
     */
    private function pickGroup(array $candidateKeys, array $groups, MaterialIssuing $issuing): ?string
    {
        $spool = strtolower(trim((string) $issuing->target_spool_no));

        if ($spool !== '') {
            foreach ($candidateKeys as $key) {
                if (strtolower(trim((string) ($groups[$key]['spool_no'] ?? ''))) === $spool) {
                    return $key;
                }
            }
        }

        foreach ($candidateKeys as $key) {
            if ((float) $groups[$key]['issued_qty'] + 0.0001 < (float) $groups[$key]['required_qty']) {
                return $key;
            }
        }

        return $candidateKeys[0] ?? null;
    }

    /**
     * @template TModel
     *
     * @param  Collection<int, TModel>  $items
     * @param  callable(TModel): string  $identity
     * @param  callable(TModel): float  $value
     * @return array<string, float>
     */
    private function sumByIdentity(Collection $items, callable $identity, callable $value): array
    {
        $totals = [];

        foreach ($items as $item) {
            $key = $identity($item);
            $totals[$key] = ($totals[$key] ?? 0.0) + $value($item);
        }

        return $totals;
    }

    private function bomIdentity(BillOfMaterial $bom): string
    {
        return $bom->material_standard_id
            ? 'std:'.$bom->material_standard_id
            : 'txt:'.$this->textKey($bom->material_spec, $bom->size, $bom->unit);
    }

    private function issuingIdentity(MaterialIssuing $issuing): string
    {
        return $issuing->material_standard_id
            ? 'std:'.$issuing->material_standard_id
            : 'txt:'.$this->textKey($issuing->specification, $issuing->size, $issuing->unit);
    }

    private function storingIdentity(MaterialStoring $stock): string
    {
        return $stock->material_standard_id
            ? 'std:'.$stock->material_standard_id
            : 'txt:'.$this->textKey($stock->specification, $stock->size, $stock->unit);
    }

    private function receivingIdentity(MaterialReceiving $receiving): string
    {
        return $receiving->material_standard_id
            ? 'std:'.$receiving->material_standard_id
            : 'txt:'.$this->textKey($receiving->specification, $receiving->size, $receiving->unit);
    }

    private function textKey(?string $specification, ?string $size, ?string $unit): string
    {
        $normalize = fn (?string $value): string => strtolower(preg_replace('/\s+/', ' ', trim((string) $value)) ?? '');
        $normalizedUnit = match ($normalize($unit)) {
            'pcs', 'pc', 'buah', 'piece', 'pieces' => 'pcs',
            'm', 'mtr', 'meter', 'meters' => 'meter',
            default => $normalize($unit),
        };

        return $normalize($specification).'|'.$normalize($size).'|'.$normalizedUnit;
    }

    private function drawingKey(int|string|null $drawingId, ?string $drawingNo): string
    {
        return $drawingId ? 'id:'.$drawingId : 'no:'.strtolower(trim((string) $drawingNo));
    }

    /**
     * @return array<string, int|float>
     */
    private function emptySummary(): array
    {
        return [
            'total_lines' => 0,
            'shortage_lines' => 0,
            'fulfilled_lines' => 0,
            'to_procure_lines' => 0,
            'required_qty' => 0,
            'issued_qty' => 0,
            'stock_balance' => 0,
            'received_qty' => 0,
        ];
    }
}
