<?php

namespace App\Services;

use App\Models\BillOfMaterial;
use App\Models\Drawing;
use App\Models\MaterialInspection;
use App\Models\MaterialAdjustment;
use App\Models\MaterialIssuing;
use App\Models\MaterialReceiving;
use App\Models\MaterialReturn;
use App\Models\MaterialStockMovement;
use App\Models\MaterialStoring;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MaterialFlowService
{
    public function createReturn(MaterialIssuing $issuing, array $data, User $user): MaterialReturn
    {
        return DB::transaction(function () use ($issuing, $data, $user): MaterialReturn {
            $stock = MaterialStoring::query()->lockForUpdate()->findOrFail($issuing->material_storing_id);
            $qty = (float) $data['qty'];
            $alreadyReturned = (float) MaterialReturn::query()->where('material_issuing_id', $issuing->id)->sum('qty');
            if ($alreadyReturned + $qty > (float) $issuing->qty + 0.0001) {
                throw ValidationException::withMessages(['qty' => 'Qty return melebihi qty issuing.']);
            }
            if ($data['condition'] !== 'GOOD') {
                $qty = 0;
            }
            $return = MaterialReturn::create([
                'project_id' => $stock->project_id,
                'material_issuing_id' => $issuing->id,
                'material_storing_id' => $stock->id,
                'return_no' => 'RT-'.now()->format('YmdHis').'-'.$issuing->id,
                'qty' => (float) $data['qty'], 'unit' => $stock->unit,
                'condition' => $data['condition'], 'reason' => $data['reason'] ?? null,
                'status' => 'APPLIED', 'department_id' => $stock->department_id, 'created_by' => $user->id,
            ]);
            if ($qty > 0) {
                $stock->increment('stock_in', $qty);
                $stock->increment('balance', $qty);
                $stock->update(['status' => 'AVAILABLE', 'last_movement_at' => now()]);
                $this->recordMovement($stock, 'IN', $qty, $stock->unit, (float) $stock->balance, 'return', $return->id, $user, 'Material return');
            }
            return $return->fresh();
        });
    }

    public function requestAdjustment(MaterialStoring $stock, array $data, User $user): MaterialAdjustment
    {
        return MaterialAdjustment::create([
            'project_id' => $stock->project_id, 'material_storing_id' => $stock->id,
            'adjustment_no' => 'ADJ-'.now()->format('YmdHis').'-'.$stock->id,
            'qty_delta' => $data['qty_delta'], 'balance_before' => $stock->balance,
            'reason' => $data['reason'], 'notes' => $data['notes'] ?? null,
            'status' => 'PENDING', 'requested_by' => $user->id,
        ]);
    }
    public function requestInspection(MaterialReceiving $receiving, User $user): MaterialReceiving
    {
        return DB::transaction(function () use ($receiving): MaterialReceiving {
            $locked = MaterialReceiving::query()->lockForUpdate()->findOrFail($receiving->id);

            if ($locked->status === 'ACCEPTED') {
                throw ValidationException::withMessages([
                    'status' => 'Material sudah diterima QC; status tidak bisa diminta ulang.',
                ]);
            }

            if ($locked->storing()->where('stock_out', '>', 0)->exists()) {
                throw ValidationException::withMessages([
                    'status' => 'Stok sudah keluar; selesaikan issuing terlebih dahulu.',
                ]);
            }

            if ($locked->status !== 'REQUESTED') {
                $locked->update([
                    'status' => 'REQUESTED',
                    'inspection_requested_at' => now(),
                ]);
            }

            return $locked->fresh();
        });
    }

    public function applyInspection(MaterialInspection $inspection, User $user): void
    {
        DB::transaction(function () use ($inspection, $user): void {
            $lockedInspection = MaterialInspection::query()->lockForUpdate()->findOrFail($inspection->id);
            $receiving = $lockedInspection->material_receiving_id
                ? MaterialReceiving::query()->lockForUpdate()->find($lockedInspection->material_receiving_id)
                : null;

            if (! $receiving) {
                return;
            }

            $lockedInspection->update([
                'project_id' => $receiving->project_id,
                'department_id' => $receiving->department_id,
            ]);

            $result = strtoupper((string) $lockedInspection->result);

            if ($result === 'ACCEPTED') {
                $acceptedQty = (float) ($lockedInspection->accepted_qty ?? $receiving->qty);

                if ($acceptedQty <= 0) {
                    throw ValidationException::withMessages([
                        'accepted_qty' => 'Qty yang diterima harus lebih besar dari nol.',
                    ]);
                }

                $receiving->update([
                    'status' => 'ACCEPTED',
                    'accepted_qty' => $acceptedQty,
                    'stocked_at' => now(),
                ]);

                $this->stockIn($receiving, $lockedInspection, $acceptedQty, $user);

                return;
            }

            if (! in_array($result, ['HOLD', 'REJECTED'], true)) {
                throw ValidationException::withMessages([
                    'result' => 'Hasil inspeksi harus ACCEPTED, HOLD, atau REJECTED.',
                ]);
            }

            $receiving->update([
                'status' => $result,
                'accepted_qty' => null,
                'stocked_at' => null,
            ]);

            $this->voidStockIfUnused($receiving, $lockedInspection, $user);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createIssuing(array $data, User $user): MaterialIssuing
    {
        return DB::transaction(function () use ($data, $user): MaterialIssuing {
            if (empty($data['project_id'])) {
                throw ValidationException::withMessages([
                    'project_id' => 'Project wajib dipilih untuk issuing material.',
                ]);
            }

            $data = $this->resolveIssuingLinks($data);
            $stock = $this->resolveStockForIssuing($data);

            if (! $stock) {
                throw ValidationException::withMessages([
                    'material_storing_id' => 'Lot stok tersedia untuk project ini tidak ditemukan.',
                ]);
            }

            if ($stock) {
                $stock = MaterialStoring::query()->lockForUpdate()->findOrFail($stock->id);

                if (! $user->isSuperAdmin() && (int) $stock->department_id !== (int) $user->department_id) {
                    throw ValidationException::withMessages([
                        'material_storing_id' => 'Stok bukan milik departemen Anda.',
                    ]);
                }

                if (! empty($data['project_id']) && $stock->project_id
                    && (int) $data['project_id'] !== (int) $stock->project_id) {
                    throw ValidationException::withMessages([
                        'project_id' => 'Stok berasal dari project yang berbeda.',
                    ]);
                }

                if (! $stock->project_id || (int) $stock->project_id !== (int) $data['project_id']) {
                    throw ValidationException::withMessages([
                        'project_id' => 'Lot stok harus memiliki project yang sama dengan issuing.',
                    ]);
                }

                if (! $stock->project_id && ! empty($data['project_id'])) {
                    $stock->update(['project_id' => $data['project_id']]);
                }

                if (! empty($data['material_standard_id']) && $stock->material_standard_id
                    && (int) $data['material_standard_id'] !== (int) $stock->material_standard_id) {
                    throw ValidationException::withMessages([
                        'material_standard_id' => 'Lot stok memakai kode standar material yang berbeda.',
                    ]);
                }

                foreach (['item_name', 'specification', 'size', 'unit', 'heat_no', 'mtc_no'] as $field) {
                    if (! empty($data[$field]) && (string) $data[$field] !== (string) $stock->{$field}) {
                        throw ValidationException::withMessages([
                            $field => 'Data material harus sama dengan lot stok yang dipilih.',
                        ]);
                    }
                }

                $this->assertStockAvailable(
                    $stock,
                    (float) ($data['qty'] ?? 0),
                    (string) ($data['unit'] ?? $stock->unit)
                );

                $data['material_storing_id'] = $stock->id;
                $data['project_id'] = $data['project_id'] ?? $stock->project_id;
                $data['material_standard_id'] = $data['material_standard_id'] ?? $stock->material_standard_id;
                $data['item_name'] = $data['item_name'] ?? $stock->item_name;
                $data['description'] = $data['description'] ?? $stock->item_name;
                $data['specification'] = $data['specification'] ?? $stock->specification;
                $data['size'] = $data['size'] ?? $stock->size;
                $data['schedule_rating'] = $data['schedule_rating'] ?? $stock->schedule_rating;
                $data['vendor'] = $data['vendor'] ?? $stock->receiving?->vendor;
                $data['unit'] = $data['unit'] ?? $stock->unit;
                $data['heat_no'] = $data['heat_no'] ?? $stock->heat_no;
                $data['mtc_no'] = $data['mtc_no'] ?? $stock->mtc_no;

                // Lot lama yang belum punya kode standar ikut terisi saat
                // pertama kali dikaitkan ke standar dari BOM/receiving.
                if (! $stock->material_standard_id && ! empty($data['material_standard_id'])) {
                    $stock->update(['material_standard_id' => $data['material_standard_id']]);
                }
            }

            $data['status'] = 'ISSUED';
            $data['cancelled_at'] = null;
            $issuing = MaterialIssuing::create($data);

            if ($stock) {
                $newOut = (float) $stock->stock_out + (float) $issuing->qty;
                $balance = (float) $stock->stock_in - $newOut;

                $stock->update([
                    'stock_out' => $newOut,
                    'balance' => $balance,
                    'status' => $balance > 0 ? 'AVAILABLE' : 'DEPLETED',
                    'last_movement_at' => now(),
                ]);

                $this->recordMovement(
                    $stock,
                    'OUT',
                    (float) $issuing->qty,
                    $stock->unit,
                    $balance,
                    'issuing',
                    $issuing->id,
                    $user
                );
            }

            return $issuing->fresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateIssuing(MaterialIssuing $issuing, array $data, User $user): MaterialIssuing
    {
        return DB::transaction(function () use ($issuing, $data, $user): MaterialIssuing {
            $locked = MaterialIssuing::query()->lockForUpdate()->findOrFail($issuing->id);

            if ($locked->status === 'CANCELLED') {
                throw ValidationException::withMessages([
                    'status' => 'Issuing yang sudah dibatalkan tidak bisa diubah.',
                ]);
            }

            $data = $this->resolveIssuingLinks($data);

            if (array_key_exists('material_storing_id', $data)
                && (int) $data['material_storing_id'] !== (int) $locked->material_storing_id) {
                throw ValidationException::withMessages([
                    'material_storing_id' => 'Lot stok tidak bisa diubah; batalkan issuing lalu buat ulang.',
                ]);
            }

            if (array_key_exists('material_standard_id', $data) && $locked->material_standard_id
                && (int) $data['material_standard_id'] !== (int) $locked->material_standard_id) {
                throw ValidationException::withMessages([
                    'material_standard_id' => 'Kode standar material mengikuti lot stok; batalkan issuing lalu buat ulang.',
                ]);
            }

            if ($locked->material_storing_id) {
                foreach (['item_name', 'specification', 'size', 'unit', 'heat_no', 'project_id'] as $field) {
                    if (array_key_exists($field, $data) && (string) $data[$field] !== (string) $locked->{$field}) {
                        throw ValidationException::withMessages([
                            $field => 'Data material mengikuti lot stok; buat issuing baru jika berbeda.',
                        ]);
                    }
                }
            }

            $newQty = array_key_exists('qty', $data) ? (float) $data['qty'] : (float) $locked->qty;
            $oldQty = (float) $locked->qty;
            $delta = $newQty - $oldQty;

            if ($newQty <= 0) {
                throw ValidationException::withMessages([
                    'qty' => 'Qty issuing harus lebih besar dari nol.',
                ]);
            }

            if ($locked->material_storing_id) {
                $stock = MaterialStoring::query()->lockForUpdate()->findOrFail($locked->material_storing_id);

                if ($delta > 0) {
                    $this->assertStockAvailable($stock, $delta, (string) ($data['unit'] ?? $locked->unit));
                }

                $newOut = (float) $stock->stock_out + $delta;

                if ($newOut < -0.0001) {
                    throw ValidationException::withMessages([
                        'qty' => 'Qty issuing tidak valid untuk stok ini.',
                    ]);
                }

                $balance = (float) $stock->stock_in - $newOut;

                $stock->update([
                    'stock_out' => $newOut,
                    'balance' => $balance,
                    'status' => $balance > 0 ? 'AVAILABLE' : 'DEPLETED',
                    'last_movement_at' => now(),
                ]);

                if (abs($delta) > 0.0001) {
                    $this->recordMovement(
                        $stock,
                        'ADJUSTMENT',
                        abs($delta),
                        $stock->unit,
                        $balance,
                        'issuing',
                        $locked->id,
                        $user,
                        $delta > 0 ? 'Qty issuing dinaikkan' : 'Qty issuing diturunkan'
                    );
                }
            }

            unset($data['material_storing_id'], $data['status'], $data['cancelled_at']);
            $data['qty'] = $newQty;
            $locked->update($data);

            return $locked->fresh();
        });
    }

    public function cancelIssuing(MaterialIssuing $issuing, User $user): MaterialIssuing
    {
        return DB::transaction(function () use ($issuing, $user): MaterialIssuing {
            $locked = MaterialIssuing::query()->lockForUpdate()->findOrFail($issuing->id);

            if ($locked->status === 'CANCELLED') {
                return $locked;
            }

            if ($locked->material_storing_id) {
                $stock = MaterialStoring::query()->lockForUpdate()->findOrFail($locked->material_storing_id);
                $qty = (float) $locked->qty;
                $newOut = max(0, (float) $stock->stock_out - $qty);
                $balance = (float) $stock->stock_in - $newOut;

                $stock->update([
                    'stock_out' => $newOut,
                    'balance' => $balance,
                    'status' => $balance > 0 ? 'AVAILABLE' : 'DEPLETED',
                    'last_movement_at' => now(),
                ]);

                $this->recordMovement(
                    $stock,
                    'REVERSAL',
                    $qty,
                    $stock->unit,
                    $balance,
                    'issuing',
                    $locked->id,
                    $user,
                    'Issuing dibatalkan'
                );
            }

            $locked->update([
                'status' => 'CANCELLED',
                'cancelled_at' => now(),
            ]);

            return $locked->fresh();
        });
    }

    public function transferStock(
        MaterialStoring $stock,
        string $storageType,
        string $location,
        User $user,
        ?string $notes = null
    ): MaterialStoring {
        return DB::transaction(function () use ($stock, $storageType, $location, $user, $notes): MaterialStoring {
            $locked = MaterialStoring::query()->lockForUpdate()->findOrFail($stock->id);
            $fromLocation = $locked->location_detail;

            if ($locked->storage_type === $storageType && $locked->location_detail === $location) {
                return $locked;
            }

            $locked->update([
                'storage_type' => $storageType,
                'location_detail' => $location,
                'last_movement_at' => now(),
            ]);

            $this->recordMovement(
                $locked,
                'TRANSFER',
                (float) $locked->balance,
                $locked->unit,
                (float) $locked->balance,
                'transfer',
                $locked->id,
                $user,
                $notes,
                $fromLocation,
                $location
            );

            return $locked->fresh();
        });
    }

    private function stockIn(
        MaterialReceiving $receiving,
        MaterialInspection $inspection,
        float $qty,
        User $user
    ): MaterialStoring {
        $stock = MaterialStoring::query()
            ->where('receiving_id', $receiving->id)
            ->lockForUpdate()
            ->first();

        $oldIn = $stock ? (float) $stock->stock_in : 0.0;
        $oldOut = $stock ? (float) $stock->stock_out : 0.0;

        if ($stock && $oldOut > 0 && abs($oldIn - $qty) > 0.0001) {
            throw ValidationException::withMessages([
                'accepted_qty' => 'Stok sudah keluar; qty inspeksi tidak bisa diubah.',
            ]);
        }

        $balance = $qty - $oldOut;

        $attributes = [
            'project_id' => $receiving->project_id,
            'receiving_id' => $receiving->id,
            'item_code' => $stock?->item_code ?? $this->lotCode($receiving),
            'line_no' => $receiving->line_no,
            'heat_no' => $receiving->heat_no,
            'mtc_no' => $receiving->mtc_no,
            'item_name' => $receiving->item_name,
            'category' => $receiving->category ?: ($stock?->category ?? 'PIPE'),
            'material_standard_id' => $receiving->material_standard_id ?? $stock?->material_standard_id,
            'specification' => $receiving->specification,
            'size' => $receiving->size,
            'schedule_rating' => $receiving->schedule_rating,
            'storage_type' => $receiving->storage_type,
            'location_detail' => $receiving->storage_location,
            'stock_in' => $qty,
            'stock_out' => $oldOut,
            'balance' => $balance,
            'status' => $balance > 0 ? 'AVAILABLE' : 'DEPLETED',
            'last_movement_at' => now(),
            'unit' => $receiving->unit ?: 'pcs',
            'min_stock_alert' => $stock?->min_stock_alert ?? 0,
            'mapping_doc_url' => $stock?->mapping_doc_url,
            'department_id' => $receiving->department_id,
        ];

        if ($stock) {
            $stock->update($attributes);
        } else {
            $stock = MaterialStoring::create($attributes);
        }

        $delta = $qty - $oldIn;

        if (abs($delta) > 0.0001) {
            $this->recordMovement(
                $stock,
                $delta > 0 ? 'IN' : 'ADJUSTMENT',
                abs($delta),
                $stock->unit,
                $balance,
                'inspection',
                $inspection->id,
                $user
            );
        }

        return $stock->fresh();
    }

    private function voidStockIfUnused(
        MaterialReceiving $receiving,
        MaterialInspection $inspection,
        User $user
    ): void {
        $stock = MaterialStoring::query()
            ->where('receiving_id', $receiving->id)
            ->lockForUpdate()
            ->first();

        if (! $stock) {
            return;
        }

        if ((float) $stock->stock_out > 0) {
            throw ValidationException::withMessages([
                'result' => 'Stok sudah keluar; batalkan issuing sebelum mengubah hasil inspeksi.',
            ]);
        }

        $oldIn = (float) $stock->stock_in;

        $stock->update([
            'stock_in' => 0,
            'stock_out' => 0,
            'balance' => 0,
            'status' => 'VOID',
            'last_movement_at' => now(),
        ]);

        if ($oldIn > 0) {
            $this->recordMovement(
                $stock,
                'REVERSAL',
                $oldIn,
                $stock->unit,
                0,
                'inspection',
                $inspection->id,
                $user,
                'Material tidak lolos inspeksi'
            );
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveStockForIssuing(array $data): ?MaterialStoring
    {
        if (! empty($data['material_storing_id'])) {
            return MaterialStoring::query()->findOrFail((int) $data['material_storing_id']);
        }

        $query = MaterialStoring::query()
            ->where('status', 'AVAILABLE')
            ->where('balance', '>', 0);

        foreach (['project_id', 'material_standard_id', 'item_name', 'specification', 'size', 'heat_no'] as $field) {
            if (! empty($data[$field])) {
                $query->where($field, $data[$field]);
            }
        }

        return $query->orderBy('id')->first();
    }

    /**
     * Normalisasi link drawing/BOM pada payload issuing. BOM adalah sumber
     * requirement; kolom teks hanya diisi bila klien belum mengirim nilainya.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function resolveIssuingLinks(array $data): array
    {
        $hasExplicitStock = ! empty($data['material_storing_id']);

        if (empty($data['bom_id'])) {
            if (empty($data['drawing_id'])) {
                return $data;
            }

            $drawing = Drawing::query()->find($data['drawing_id']);

            if (! $drawing) {
                throw ValidationException::withMessages([
                    'drawing_id' => 'Drawing tidak ditemukan.',
                ]);
            }

            if (! empty($data['project_id']) && (int) $data['project_id'] !== (int) $drawing->project_id) {
                throw ValidationException::withMessages([
                    'drawing_id' => 'Drawing berasal dari project yang berbeda.',
                ]);
            }

            $data['drawing_no'] = $data['drawing_no'] ?? $drawing->drawing_no;
            $data['project_id'] = $data['project_id'] ?? $drawing->project_id;

            return $data;
        }

        $bom = BillOfMaterial::query()->with('drawing')->find($data['bom_id']);

        if (! $bom) {
            throw ValidationException::withMessages([
                'bom_id' => 'Baris BOM tidak ditemukan.',
            ]);
        }

        if (! empty($data['project_id']) && (int) $data['project_id'] !== (int) $bom->project_id) {
            throw ValidationException::withMessages([
                'project_id' => 'BOM berasal dari project yang berbeda.',
            ]);
        }

        if (! empty($data['project_id']) && $bom->project_id && (int) $data['project_id'] !== (int) $bom->project_id) {
            throw ValidationException::withMessages([
                'project_id' => 'BOM berasal dari project yang berbeda.',
            ]);
        }

        if (! empty($data['drawing_id']) && $bom->drawing_id && (int) $data['drawing_id'] !== (int) $bom->drawing_id) {
            throw ValidationException::withMessages([
                'drawing_id' => 'BOM tidak terhubung ke drawing yang dipilih.',
            ]);
        }

        if (! empty($data['material_standard_id']) && $bom->material_standard_id
            && (int) $data['material_standard_id'] !== (int) $bom->material_standard_id) {
            throw ValidationException::withMessages([
                'material_standard_id' => 'Lot stok tidak sesuai kode standar material pada BOM.',
            ]);
        }

        $data['drawing_id'] = $data['drawing_id'] ?? $bom->drawing_id;
        $data['drawing_no'] = $data['drawing_no'] ?? $bom->drawing?->drawing_no;
        $data['material_standard_id'] = $data['material_standard_id'] ?? $bom->material_standard_id;
        $data['target_spool_no'] = $data['target_spool_no'] ?? $bom->spool_no;
        $data['project_id'] = $data['project_id'] ?? $bom->project_id;

        if (! $hasExplicitStock) {
            $data['item_name'] = $data['item_name'] ?? $bom->description;
            $data['description'] = $data['description'] ?? $bom->description;
            $data['specification'] = $data['specification'] ?? $bom->material_spec;
            $data['size'] = $data['size'] ?? $bom->size;
            $data['schedule_rating'] = $data['schedule_rating'] ?? $bom->rating_sch;
            $data['unit'] = $data['unit'] ?? $bom->unit;
        }

        return $data;
    }

    private function assertStockAvailable(MaterialStoring $stock, float $qty, string $unit): void
    {
        if ($qty <= 0) {
            throw ValidationException::withMessages([
                'qty' => 'Qty issuing harus lebih besar dari nol.',
            ]);
        }

        if ($stock->status !== 'AVAILABLE') {
            throw ValidationException::withMessages([
                'material_storing_id' => 'Lot stok tidak tersedia untuk issuing.',
            ]);
        }

        if ((float) $stock->balance + 0.0001 < $qty) {
            throw ValidationException::withMessages([
                'qty' => 'Stok tidak cukup. Sisa '.$stock->balance.' '.$stock->unit.'.',
            ]);
        }

        if (strcasecmp(trim($unit), trim((string) $stock->unit)) !== 0) {
            throw ValidationException::withMessages([
                'unit' => 'Satuan issuing harus sama dengan satuan stok ('.$stock->unit.').',
            ]);
        }
    }

    public function recordOpeningStock(MaterialStoring $stock, User $user): void
    {
        $stockIn = (float) $stock->stock_in;
        $stockOut = (float) $stock->stock_out;
        $unit = (string) ($stock->unit ?: 'pcs');

        if ($stockIn > 0) {
            $this->recordMovement(
                $stock,
                'IN',
                $stockIn,
                $unit,
                $stockIn,
                'manual',
                $stock->id,
                $user,
                'Stok awal / input manual'
            );
        }

        if ($stockOut > 0) {
            $this->recordMovement(
                $stock,
                'OUT',
                $stockOut,
                $unit,
                $stockIn - $stockOut,
                'manual',
                $stock->id,
                $user,
                'Stok awal keluar / input manual'
            );
        }
    }

    private function recordMovement(
        MaterialStoring $stock,
        string $type,
        float $qty,
        string $unit,
        float $balanceAfter,
        string $referenceType,
        ?int $referenceId,
        User $user,
        ?string $notes = null,
        ?string $fromLocation = null,
        ?string $toLocation = null
    ): MaterialStockMovement {
        return MaterialStockMovement::create([
            'project_id' => $stock->project_id,
            'material_storing_id' => $stock->id,
            'type' => $type,
            'qty' => $qty,
            'unit' => $unit,
            'balance_after' => $balanceAfter,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'from_location' => $fromLocation,
            'to_location' => $toLocation,
            'notes' => $notes,
            'department_id' => $stock->department_id,
            'created_by' => $user->id,
            'occurred_at' => now(),
        ]);
    }

    private function lotCode(MaterialReceiving $receiving): string
    {
        return 'LOT-'.str_pad((string) $receiving->id, 6, '0', STR_PAD_LEFT);
    }
}
