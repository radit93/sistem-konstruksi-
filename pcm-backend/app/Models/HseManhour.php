<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HseManhour extends Model
{
    protected $fillable = [
        'project_id', 'work_date', 'area', 'contractor', 'worker_count',
        'work_hours', 'manhours', 'notes', 'department_id', 'created_by',
    ];

    protected $casts = [
        'work_date' => 'date',
        'work_hours' => 'decimal:2',
        'manhours' => 'decimal:2',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
