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
}
