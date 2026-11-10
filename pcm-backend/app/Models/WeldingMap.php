<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WeldingMap extends Model
{
    protected $fillable = [
        'project_id',
        'drawing_id',
        'line_no',
        'iso_drawing_no',
        'sheet',
        'spool_no',
        'joint_no',
        'joint_type',
        'size',
        'dia_inch',
        'thickness',
        'length_mm',
        'location',
        'wps_no',
        'mat_a_item',
        'mat_a_spec',
        'mat_a_group',
        'mat_a_category',
        'mat_a_size',
        'mat_a_sch',
        'mat_b_item',
        'mat_b_spec',
        'mat_b_group',
        'mat_b_category',
        'mat_b_size',
        'mat_b_sch',
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
