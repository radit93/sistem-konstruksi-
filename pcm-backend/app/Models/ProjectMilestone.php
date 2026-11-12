<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectMilestone extends Model
{
    protected $fillable = [
        'project_id',
        'user_id',
        'project_role',
        'code',
        'name',
        'phase',
        'start_date',
        'target_date',
        'actual_date',
        'estimated_days',
        'work_hours_per_day',
        'weight_pct',
        'status',
        'is_hold_point',
        'pic_lead',
        'remarks',
        'department_id',
    ];

    protected $casts = [
        'is_hold_point' => 'boolean',
        'estimated_days' => 'integer',
        'work_hours_per_day' => 'float',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function activities()
    {
        return $this->hasMany(MilestoneActivity::class, 'project_milestone_id')
            ->orderBy('day_number')
            ->orderBy('time_start');
    }
}
