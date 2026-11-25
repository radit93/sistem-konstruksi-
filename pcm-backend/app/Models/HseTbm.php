<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HseTbm extends Model
{
    protected $table = 'hse_tbm';

    protected $fillable = [
        'project_id', 'tbm_date', 'shift', 'location', 'topic',
        'attendees_count', 'attendee_list', 'leader_name', 'notes',
        'photo_path', 'department_id', 'created_by',
    ];

    protected $casts = [
        'tbm_date' => 'date',
        'attendee_list' => 'array',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
