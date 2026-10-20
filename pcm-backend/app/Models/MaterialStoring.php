<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialStoring extends Model
{
    protected $fillable = [
        'project_id',
        'item_code',
        'item_name',
        'category',
        'specification',
        'size',
        'schedule_rating',
        'storage_type',
        'location_detail',
        'stock_in',
        'stock_out',
        'balance',
        'unit',
        'min_stock_alert',
        'mapping_doc_url',
        'department_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
