<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FittingStandard extends Model
{
    protected $fillable = [
        'item_code', 'category', 'fitting_type', 'asme_standard', 'connection',
        'nps_main', 'dn_main_mm', 'od_main_mm', 'nps_secondary', 'dn_secondary_mm',
        'od_secondary_mm', 'dimension_primary_mm', 'dimension_secondary_mm',
        'schedule_class', 'wall_mm', 'material_cs', 'material_ss', 'weight_cs_kg',
        'weight_ss_kg', 'status', 'source_reference',
    ];

    protected function casts(): array
    {
        return [
            'od_main_mm' => 'decimal:2',
            'od_secondary_mm' => 'decimal:2',
            'dimension_primary_mm' => 'decimal:2',
            'dimension_secondary_mm' => 'decimal:2',
            'wall_mm' => 'decimal:2',
            'weight_cs_kg' => 'decimal:3',
            'weight_ss_kg' => 'decimal:3',
        ];
    }
}
