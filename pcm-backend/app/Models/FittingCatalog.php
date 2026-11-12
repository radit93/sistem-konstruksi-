<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FittingCatalog extends Model
{
    protected $fillable = [
        'item_code',
        'category',
        'fitting_type',
        'asme_standard',
        'connection',
        'nps_primary',
        'dn_primary_mm',
        'od_primary_mm',
        'nps_secondary',
        'dn_secondary_mm',
        'od_secondary_mm',
        'dimension_primary_mm',
        'dimension_secondary_mm',
        'schedule_class',
        'wall_thickness_mm',
        'material_cs_spec',
        'material_ss_spec',
        'weight_cs_kg',
        'weight_ss_kg',
        'status',
        'source_reference',
    ];

    public function billOfMaterials(): HasMany
    {
        return $this->hasMany(BillOfMaterial::class);
    }

    /**
     * Cari fitting yang pas berdasarkan teks size dan schedule dari BOM / form.
     */
    public static function matchForBom(?string $componentType, ?string $size, ?string $ratingSch, ?string $materialSpec = null): ?self
    {
        if (! $componentType || ! $size) {
            return null;
        }

        $type = strtolower($componentType);
        $sizeClean = trim(str_replace('"', '', $size));
        $schClean = $ratingSch ? strtoupper(trim($ratingSch)) : null;

        $query = self::query()->where('status', 'ACTIVE');

        if (str_contains($type, 'elbow 90') || str_contains($type, 'el 90')) {
            $query->where('fitting_type', 'like', '%Elbow 90%');
        } elseif (str_contains($type, 'elbow 45') || str_contains($type, 'el 45')) {
            $query->where('fitting_type', 'like', '%Elbow 45%');
        } elseif (str_contains($type, 'tee')) {
            $query->where('fitting_type', 'like', '%Tee%');
        } elseif (str_contains($type, 'reducer')) {
            $query->where('fitting_type', 'like', '%Reducer%');
        } elseif (str_contains($type, 'cap')) {
            $query->where('fitting_type', 'like', '%Cap%');
        }

        $query->where(function ($q) use ($size, $sizeClean) {
            $q->where('nps_primary', $size)
                ->orWhere('nps_primary', $sizeClean)
                ->orWhere('nps_primary', $sizeClean.'"');
        });

        if ($schClean) {
            $query->where(function ($q) use ($schClean) {
                $q->where('schedule_class', $schClean)
                    ->orWhere('schedule_class', str_replace('SCH', 'Sch ', $schClean))
                    ->orWhere('schedule_class', 'like', '%'.$schClean.'%');
            });
        }

        return $query->first();
    }
}
