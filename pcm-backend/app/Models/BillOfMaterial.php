<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillOfMaterial extends Model
{
    protected $fillable = [
        'project_id',
        'drawing_id',
        'spool_no',
        'item_no',
        'component_type',
        'description',
        'size',
        'rating_sch',
        'material_spec',
        'qty',
        'unit',
        'tag_number',
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
