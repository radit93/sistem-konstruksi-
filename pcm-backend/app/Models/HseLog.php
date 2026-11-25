<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HseLog extends Model
{
    protected $fillable = [
        'project_id', 'log_no', 'log_date', 'kind', 'location', 'description',
        'action_taken', 'status', 'severity', 'pic', 'due_date', 'photo_path',
        'department_id', 'created_by',
    ];

    protected $casts = [
        'log_date' => 'date',
        'due_date' => 'date',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
