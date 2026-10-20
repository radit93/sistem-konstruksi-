<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialReceiving extends Model
{
    protected $fillable = [
        'project_id',
        'arrival_date',
        'shipment_no',
        'po_no',
        'vendor',
        'item_name',
        'description',
        'specification',
        'size',
        'schedule_rating',
        'heat_no',
        'mtc_no',
        'qty',
        'unit',
        'storage_type',
        'storage_location',
        'status',
        'remarks',
        'department_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function inspections()
    {
        return $this->hasMany(MaterialInspection::class);
    }
}
