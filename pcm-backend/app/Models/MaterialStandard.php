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
        'schedule',
        'size_range',
        'description',
        'department_id',
    ];
}
