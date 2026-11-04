<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialStandard extends Model
{
    protected $fillable = [
        'code',
        'category',
        'specification',
        'material_group',
        'rating_class',
        'rating',
        'class',
        'schedule',
        'size_range',
        'description',
        'source',
        'is_interim',
        'department_id',
    ];

    protected $casts = [
        'is_interim' => 'boolean',
    ];
}
