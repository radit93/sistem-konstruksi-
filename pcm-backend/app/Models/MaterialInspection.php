<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialInspection extends Model
{
    protected $fillable = [
        'project_id',
        'material_receiving_id',
        'report_no',
        'inspection_date',
        'inspector_name',
        'item_name',
        'heat_no',
        'visual_check',
        'dimension_check',
        'mtc_check',
        'result',
        'ncr_no',
        'notes',
        'department_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function receiving()
    {
        return $this->belongsTo(MaterialReceiving::class, 'material_receiving_id');
    }
}
