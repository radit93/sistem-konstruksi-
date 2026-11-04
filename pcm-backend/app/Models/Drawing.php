<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Drawing extends Model
{
    protected $fillable = [
        'project_id',
        'drawing_no',
        'title',
        'line_no',
        'line_service',
        'material_spec',
        'fitup_specs',
        'size_range',
        'area',
        'sheet',
        'rev',
        'total_dia_inch',
        'total_joints',
        'scan_path',
        'distributed_to',
        'distribution_date',
        'status',
        'department_id',
    ];

    protected $casts = [
        'fitup_specs' => 'array',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function billOfMaterials()
    {
        return $this->hasMany(BillOfMaterial::class);
    }

    public function materialIssuings()
    {
        return $this->hasMany(MaterialIssuing::class);
    }
}
