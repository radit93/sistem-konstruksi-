<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LineService extends Model
{
    protected $fillable = [
        'project_id',
        'line_no',
        'service_name',
        'fluid_code',
        'piping_class',
        'design_press',
        'design_temp',
        'operating_press',
        'operating_temp',
        'test_press',
        'test_medium',
        'insulation',
        'department_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
