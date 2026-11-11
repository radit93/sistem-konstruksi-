<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PipeStandard extends Model
{
    protected $fillable = [
        'nps',
        'dn',
        'outer_diameter_mm',
        'schedule',
        'wall_thickness_mm',
        'weight_kg_m',
        'standard_length_m',
        'weight_kg_stick',
        'source',
        'is_interim',
        'department_id',
    ];

    protected $casts = [
        'outer_diameter_mm' => 'float',
        'wall_thickness_mm' => 'float',
        'weight_kg_m' => 'float',
        'standard_length_m' => 'float',
        'weight_kg_stick' => 'float',
        'is_interim' => 'boolean',
    ];

    protected $appends = [
        'welding_cost',
    ];

    /**
     * Estimasi biaya pengelasan dari elektroda per joint (ketebalan x diameter x 1.2 x pengali rupiah realistis).
     * Faktor 50 mengonversi estimasi gram logam las ke nilai rupiah riil elektroda lapangan (~Rp 50.000/kg).
     */
    public function getWeldingCostAttribute(): ?float
    {
        if ($this->wall_thickness_mm && $this->outer_diameter_mm) {
            return round($this->wall_thickness_mm * $this->outer_diameter_mm * 1.2 * 50, 0);
        }

        return null;
    }
}
