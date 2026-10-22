<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyProgress extends Model
{
    protected $fillable = [
        'project_id',
        'prog_date',
        'scope',
        'qty',
        'team',
        'department_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
