<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MilestoneActivity extends Model
{
    protected $fillable = [
        'project_milestone_id',
        'day_number',
        'work_date',
        'time_start',
        'time_end',
        'activity',
        'target_output',
        'is_done',
        'notes',
    ];

    protected $casts = [
        'day_number' => 'integer',
        'is_done' => 'boolean',
    ];

    public function milestone()
    {
        return $this->belongsTo(ProjectMilestone::class, 'project_milestone_id');
    }
}
