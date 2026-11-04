<?php

namespace App\Services;

use App\Models\MaterialDocument;
use App\Models\MaterialIssuing;
use App\Models\MaterialReceiving;
use App\Models\MaterialStoring;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Menyusun data laporan resmi Material Control dari sumber transaksi yang
 * sama dengan layar operasional. Semua query sudah dibatasi departemen oleh
 * controller; service hanya menangani filter, agregasi, dan bentuk cetak.
 */
class MaterialReportService
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function receiving(Builder $query, array $filters, User $user, ?Project $project): array
    {
        $query->with([
            'materialStandard',
            'storing',
            'inspections',
            'documents',
        ]);

        $this->applyDateRange($query, $filters, 'arrival_date');
        $this->applyProjectFilter($query, $filters);

        if (($filters['status'] ?? 'ALL') !== 'ALL') {
            $query->where('status', $filters['status']);
        }

        $this->applySearch($query, $filters, [
            'shipment_no', 'line_no', 'po_no', 'vendor', 'item_name',
            'description', 'specification', 'size', 'heat_no', 'mtc_no',
        ], 'materialStandard');

        $records = $query->orderByDesc('arrival_date')->orderByDesc('id')->get();

        $rows = $records->map(function (MaterialReceiving $receiving): array {
            $inspection = $receiving->inspections
                ->sortByDesc(fn ($item): string => (string) $item->inspection_date)
                ->first();

            return [
                'id' => $receiving->id,
                'arrival_date' => $receiving->arrival_date?->format('Y-m-d'),
                'shipment_no' => $receiving->shipment_no,
                'line_no' => $receiving->line_no,
                'po_no' => $receiving->po_no,
                'vendor' => $receiving->vendor,
                'item_name' => $receiving->item_name,
                'description' => $receiving->description,
                'specification' => $receiving->specification,
                'size' => $receiving->size,
                'schedule_rating' => $receiving->schedule_rating,
                'qty' => (float) $receiving->qty,
                'accepted_qty' => $receiving->accepted_qty === null ? null : (float) $receiving->accepted_qty,
                'unit' => $receiving->unit,
                'packing_type' => $receiving->packing_type,
                'heat_no' => $receiving->heat_no,
                'mtc_no' => $receiving->mtc_no,
                'storage_type' => $receiving->storage_type,
                'storage_location' => $receiving->storage_location,
                'status' => $receiving->status,
                'remarks' => $receiving->remarks,
                'standard_code' => $receiving->materialStandard?->code,
                'lot_code' => $receiving->storing?->item_code,
                'lot_balance' => $receiving->storing ? (float) $receiving->storing->balance : null,
                'inspection_no' => $inspection?->report_no,
                'inspection_result' => $inspection?->result,
                'inspection_date' => $inspection?->inspection_date?->format('Y-m-d'),
                'documents_count' => $receiving->documents->count(),
            ];
        })->values()->all();

        $statusCounts = $records->countBy('status');

        return [
            'meta' => $this->meta('receiving', $user, $filters, $project),
            'summary' => [
                'total_batches' => $records->count(),
                'accepted_batches' => (int) ($statusCounts['ACCEPTED'] ?? 0),
                'pending_batches' => (int) (($statusCounts['RECEIVED'] ?? 0)
                    + ($statusCounts['REQUESTED'] ?? 0)
                    + ($statusCounts['INSPECTED'] ?? 0)),
                'hold_batches' => (int) ($statusCounts['HOLD'] ?? 0),
                'rejected_batches' => (int) ($statusCounts['REJECTED'] ?? 0),
                'total_documents' => (int) $records->sum(fn (MaterialReceiving $item): int => $item->documents->count()),
                'unit_totals' => $this->quantityTotals($records, ['qty', 'accepted_qty']),
            ],
            'rows' => $rows,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function issuing(Builder $query, array $filters, User $user, ?Project $project): array
    {
        $query->with([
            'materialStandard',
            'drawing',
            'bom',
            'storing.receiving',
            'documents',
        ]);

        $this->applyDateRange($query, $filters, 'issue_date');
        $this->applyProjectFilter($query, $filters);
        $this->applyIssuingStatus($query, $filters);

        $this->applySearch($query, $filters, [
            'issue_no', 'requestor', 'target_spool_no', 'target_line_no',
            'drawing_no', 'item_name', 'description', 'specification', 'size', 'schedule_rating', 'heat_no',
            'issued_by', 'vendor',
        ], 'materialStandard');

        $records = $query->orderByDesc('issue_date')->orderByDesc('id')->get();

        $rows = $records->map(function (MaterialIssuing $issuing): array {
            return [
                'id' => $issuing->id,
                'issue_date' => $issuing->issue_date?->format('Y-m-d'),
                'issue_no' => $issuing->issue_no,
                'requestor' => $issuing->requestor,
                'target_spool_no' => $issuing->target_spool_no,
                'target_line_no' => $issuing->target_line_no,
                'drawing_no' => $issuing->drawing_no ?? $issuing->drawing?->drawing_no,
                'bom_id' => $issuing->bom_id,
                'vendor' => $issuing->vendor ?? $issuing->storing?->receiving?->vendor,
                'item_name' => $issuing->item_name,
                'description' => $issuing->description ?? $issuing->materialStandard?->description ?? $issuing->storing?->item_name,
                'category' => $issuing->materialStandard?->category ?? $issuing->storing?->category,
                'specification' => $issuing->specification,
                'size' => $issuing->size,
                'schedule_rating' => $issuing->schedule_rating ?? $issuing->storing?->schedule_rating ?? $issuing->materialStandard?->schedule,
                'qty' => (float) $issuing->qty,
                'unit' => $issuing->unit,
                'heat_no' => $issuing->heat_no,
                'issued_by' => $issuing->issued_by,
                'status' => $issuing->status,
                'remarks' => $issuing->remarks,
                'standard_code' => $issuing->materialStandard?->code,
                'lot_code' => $issuing->storing?->item_code,
                'documents_count' => $issuing->documents->count(),
            ];
        })->values()->all();

        $active = $records->filter(fn (MaterialIssuing $item): bool => $item->status !== 'CANCELLED');
        $cancelled = $records->filter(fn (MaterialIssuing $item): bool => $item->status === 'CANCELLED');

        return [
            'meta' => $this->meta('issuing', $user, $filters, $project),
            'summary' => [
                'total_slips' => $records->count(),
                'active_slips' => $active->count(),
                'cancelled_slips' => $cancelled->count(),
                'total_documents' => (int) $records->sum(fn (MaterialIssuing $item): int => $item->documents->count()),
                'unit_totals' => $this->quantityTotals($active, ['qty']),
            ],
            'rows' => $rows,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function stockList(Builder $query, array $filters, User $user, ?Project $project): array
    {
        $query->with(['materialStandard', 'receiving', 'documents'])
            ->where(function (Builder $inner): void {
                $inner->whereNull('status')->orWhere('status', '!=', 'VOID');
            });

        $this->applyProjectFilter($query, $filters);

        if (($filters['storage_type'] ?? 'ALL') !== 'ALL') {
            $query->where('storage_type', $filters['storage_type']);
        }

        if (($filters['category'] ?? 'ALL') !== 'ALL') {
            $query->where('category', $filters['category']);
        }

        if (! empty($filters['location'])) {
            $query->where('location_detail', 'like', '%'.$filters['location'].'%');
        }

        $stockStatus = $filters['stock_status'] ?? 'ALL';

        if ($stockStatus === 'LOW') {
            $query->whereColumn('balance', '<=', 'min_stock_alert');
        } elseif ($stockStatus === 'OUT') {
            $query->where('balance', '<=', 0);
        } elseif ($stockStatus === 'NORMAL') {
            $query->whereColumn('balance', '>', 'min_stock_alert');
        }

        $this->applySearch($query, $filters, [
            'item_code', 'item_name', 'category', 'specification', 'size',
            'schedule_rating', 'line_no', 'heat_no', 'location_detail',
        ], 'materialStandard');

        $records = $query
            ->orderByRaw("CASE WHEN storage_type = 'OPEN_YARD' THEN 0 ELSE 1 END")
            ->orderBy('location_detail')
            ->orderBy('item_code')
            ->get();

        $rows = $records->map(function (MaterialStoring $stock): array {
            $balance = (float) $stock->balance;
            $minimum = (float) $stock->min_stock_alert;

            return [
                'id' => $stock->id,
                'item_code' => $stock->item_code,
                'item_name' => $stock->item_name,
                'category' => $stock->category,
                'specification' => $stock->specification,
                'size' => $stock->size,
                'schedule_rating' => $stock->schedule_rating,
                'line_no' => $stock->line_no,
                'heat_no' => $stock->heat_no,
                'stock_in' => (float) $stock->stock_in,
                'stock_out' => (float) $stock->stock_out,
                'balance' => $balance,
                'unit' => $stock->unit,
                'storage_type' => $stock->storage_type,
                'location_detail' => $stock->location_detail,
                'min_stock_alert' => $minimum,
                'status' => $stock->status,
                'low_stock' => $balance <= $minimum,
                'standard_code' => $stock->materialStandard?->code,
                'receiving_no' => $stock->receiving?->shipment_no,
                'po_no' => $stock->receiving?->po_no,
                'documents_count' => $stock->documents->count(),
            ];
        })->values()->all();

        $locations = $records
            ->map(fn (MaterialStoring $stock): string => ($stock->storage_type ?: 'WAREHOUSE').'|'.$stock->location_detail)
            ->unique()
            ->values();

        return [
            'meta' => $this->meta('stock', $user, $filters, $project),
            'summary' => [
                'total_items' => $records->count(),
                'available_items' => $records->filter(fn (MaterialStoring $item): bool => (float) $item->balance > 0)->count(),
                'empty_items' => $records->filter(fn (MaterialStoring $item): bool => (float) $item->balance <= 0)->count(),
                'low_stock_items' => $records->filter(
                    fn (MaterialStoring $item): bool => (float) $item->balance <= (float) $item->min_stock_alert
                )->count(),
                'total_locations' => $locations->count(),
                'open_yard_items' => $records->where('storage_type', 'OPEN_YARD')->count(),
                'warehouse_items' => $records->where('storage_type', 'WAREHOUSE')->count(),
                'total_documents' => (int) $records->sum(fn (MaterialStoring $item): int => $item->documents->count()),
                'unit_totals' => $this->quantityTotals($records, ['stock_in', 'stock_out', 'balance']),
            ],
            'rows' => $rows,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function locationMap(Builder $query, array $filters, User $user, ?Project $project): array
    {
        $query->with(['materialStandard', 'documents'])
            ->where(function (Builder $inner): void {
                $inner->whereNull('status')->orWhere('status', 'AVAILABLE');
            })
            ->where('balance', '>', 0);

        $this->applyProjectFilter($query, $filters);

        if (($filters['storage_type'] ?? 'ALL') !== 'ALL') {
            $query->where('storage_type', $filters['storage_type']);
        }

        if (! empty($filters['location'])) {
            $query->where('location_detail', 'like', '%'.$filters['location'].'%');
        }

        $this->applySearch($query, $filters, [
            'item_code', 'item_name', 'category', 'specification', 'size',
            'line_no', 'heat_no', 'location_detail',
        ], 'materialStandard');

        $records = $query
            ->orderByRaw("CASE WHEN storage_type = 'OPEN_YARD' THEN 0 ELSE 1 END")
            ->orderBy('location_detail')
            ->orderBy('item_code')
            ->get();

        $locations = $records
            ->groupBy(fn (MaterialStoring $stock): string => ($stock->storage_type ?: 'WAREHOUSE').'|'.$stock->location_detail)
            ->map(function (Collection $stocks, string $key): array {
                [$storageType, $location] = array_pad(explode('|', $key, 2), 2, '');
                /** @var MaterialStoring $first */
                $first = $stocks->first();

                $mappingDocuments = $stocks
                    ->flatMap(fn (MaterialStoring $stock): Collection => $stock->documents)
                    ->filter(fn (MaterialDocument $document): bool => in_array($document->category, ['MAPPING', 'LAYOUT'], true))
                    ->unique('id')
                    ->values()
                    ->map(fn (MaterialDocument $document): array => [
                        'id' => $document->id,
                        'name' => $document->original_name,
                        'category' => $document->category,
                        'category_label' => $document->category_label,
                        'download_url' => $document->download_url,
                        'uploaded_at' => $document->created_at?->format('Y-m-d H:i'),
                    ])
                    ->all();

                return [
                    'key' => $key,
                    'storage_type' => $storageType ?: 'WAREHOUSE',
                    'location_detail' => $location ?: 'Tanpa lokasi',
                    'item_count' => $stocks->count(),
                    'unit_totals' => $this->quantityTotals($stocks, ['balance']),
                    'mapping_documents' => $mappingDocuments,
                    'items' => $stocks->map(fn (MaterialStoring $stock): array => [
                        'id' => $stock->id,
                        'item_code' => $stock->item_code,
                        'item_name' => $stock->item_name,
                        'category' => $stock->category,
                        'standard_code' => $stock->materialStandard?->code,
                        'specification' => $stock->specification,
                        'size' => $stock->size,
                        'schedule_rating' => $stock->schedule_rating,
                        'line_no' => $stock->line_no,
                        'heat_no' => $stock->heat_no,
                        'balance' => (float) $stock->balance,
                        'unit' => $stock->unit,
                        'minimum' => (float) $stock->min_stock_alert,
                    ])->values()->all(),
                ];
            })
            ->sort(function (array $a, array $b): int {
                $type = $a['storage_type'] <=> $b['storage_type'];

                return $type !== 0
                    ? $type
                    : strnatcasecmp($a['location_detail'], $b['location_detail']);
            })
            ->values();

        $mappingDocumentCount = $locations->sum(
            fn (array $location): int => count($location['mapping_documents'])
        );

        return [
            'meta' => $this->meta('location-map', $user, $filters, $project),
            'summary' => [
                'total_locations' => $locations->count(),
                'total_items' => $records->count(),
                'open_yard_locations' => $locations->filter(
                    fn (array $location): bool => $location['storage_type'] === 'OPEN_YARD'
                )->count(),
                'warehouse_locations' => $locations->filter(
                    fn (array $location): bool => $location['storage_type'] === 'WAREHOUSE'
                )->count(),
                'mapping_documents' => $mappingDocumentCount,
                'unit_totals' => $this->quantityTotals($records, ['balance']),
            ],
            'rows' => $locations->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyProjectFilter(Builder $query, array $filters): void
    {
        if (! empty($filters['project_id'])) {
            $query->where('project_id', (int) $filters['project_id']);
        }
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyDateRange(Builder $query, array $filters, string $column): void
    {
        if (! empty($filters['date_from'])) {
            $query->whereDate($column, '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate($column, '<=', $filters['date_to']);
        }
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyIssuingStatus(Builder $query, array $filters): void
    {
        $status = $filters['status'] ?? 'ALL';

        if ($status === 'CANCELLED') {
            $query->where('status', 'CANCELLED');

            return;
        }

        if ($status === 'ISSUED') {
            $query->where('status', 'ISSUED');

            return;
        }

        if ($status === 'ALL') {
            return;
        }

        $query->where(function (Builder $inner): void {
            $inner->whereNull('status')->orWhere('status', '!=', 'CANCELLED');
        });
    }

    /**
     * @param  array<string, mixed>  $filters
     * @param  array<int, string>  $columns
     */
    private function applySearch(Builder $query, array $filters, array $columns, ?string $standardRelation = null): void
    {
        $search = trim((string) ($filters['search'] ?? ''));

        if ($search === '') {
            return;
        }

        $query->where(function (Builder $inner) use ($search, $columns, $standardRelation): void {
            foreach ($columns as $index => $column) {
                $method = $index === 0 ? 'where' : 'orWhere';
                $inner->{$method}($column, 'like', "%{$search}%");
            }

            if ($standardRelation) {
                $inner->orWhereHas(
                    $standardRelation,
                    fn (Builder $standard): Builder => $standard->where('code', 'like', "%{$search}%")
                );
            }
        });
    }

    /**
     * @param  Collection<int, MaterialReceiving|MaterialIssuing|MaterialStoring>  $records
     * @param  array<int, string>  $fields
     * @return array<int, array<string, float|string>>
     */
    private function quantityTotals(Collection $records, array $fields): array
    {
        return $records
            ->groupBy(fn ($record): string => (string) ($record->unit ?: '-'))
            ->map(function (Collection $items, string $unit) use ($fields): array {
                $row = ['unit' => $unit];

                foreach ($fields as $field) {
                    $row[$field] = round($items->sum(fn ($item): float => (float) ($item->{$field} ?? 0)), 2);
                }

                return $row;
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function meta(string $type, User $user, array $filters, ?Project $project): array
    {
        $titles = [
            'receiving' => ['title' => 'Material Receiving Report', 'document_no' => 'MAT-000/FE'],
            'issuing' => ['title' => 'Material Issuing Report', 'document_no' => 'MAT-005/FE'],
            'stock' => ['title' => 'Material Stock List', 'document_no' => 'MAT-002/FE'],
            'location-map' => ['title' => 'Mapping Material Location', 'document_no' => 'MAT-003/FE'],
        ];

        return [
            'type' => $type,
            'title' => $titles[$type]['title'],
            'document_no' => $titles[$type]['document_no'],
            'generated_at' => now()->toIso8601String(),
            'generated_by' => $user->name,
            'generated_by_role' => $user->roleModel?->name ?? $user->role,
            'project' => $project?->only(['id', 'name', 'job_no', 'client']),
            'filters' => array_filter($filters, fn ($value): bool => $value !== null && $value !== '' && $value !== 'ALL'),
        ];
    }
}
