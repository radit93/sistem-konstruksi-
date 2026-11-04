<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    public function billOfMaterials(): HasMany
    {
        return $this->hasMany(BillOfMaterial::class);
    }

    public function storings(): HasMany
    {
        return $this->hasMany(MaterialStoring::class);
    }
}
