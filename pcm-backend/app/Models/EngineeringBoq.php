<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EngineeringBoq extends Model
{
    protected $fillable = [
        'project_id',
        'drawing_id',
        'line_no',
        'item_code',
        'work_scope',
        'material_group',
        'dia_inch_total',
        'joints_count',
        'spools_count',
        'weight_kg',
        'status',
        'department_id',
    ];

    public function drawing()
    {
        return $this->belongsTo(Drawing::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
