<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'accepted_qty',
        'ncr_no',
        'notes',
        'department_id',
    ];

    protected function casts(): array
    {
        return [
            'inspection_date' => 'date',
            'accepted_qty' => 'decimal:2',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function receiving(): BelongsTo
    {
        return $this->belongsTo(MaterialReceiving::class, 'material_receiving_id');
    }
}
