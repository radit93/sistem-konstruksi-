<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectMilestone extends Model
{
    protected $fillable = [
        'project_id',
        'code',
        'name',
        'phase',
        'target_date',
        'actual_date',
        'weight_pct',
        'status',
        'is_hold_point',
        'pic_lead',
        'remarks',
        'department_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
