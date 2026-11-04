<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class MaterialReceiving extends Model
{
    protected $fillable = [
        'project_id',
        'arrival_date',
        'shipment_no',
        'line_no',
        'po_no',
        'vendor',
        'item_name',
        'category',
        'material_standard_id',
        'description',
        'specification',
        'size',
        'schedule_rating',
        'heat_no',
        'mtc_no',
        'qty',
        'accepted_qty',
        'unit',
        'packing_type',
        'storage_type',
        'storage_location',
        'status',
        'inspection_requested_at',
        'stocked_at',
        'remarks',
        'department_id',
    ];

    protected function casts(): array
    {
        return [
            'arrival_date' => 'date',
            'qty' => 'decimal:2',
            'accepted_qty' => 'decimal:2',
            'inspection_requested_at' => 'datetime',
            'stocked_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function materialStandard(): BelongsTo
    {
        return $this->belongsTo(MaterialStandard::class);
    }

    public function inspections(): HasMany
    {
        return $this->hasMany(MaterialInspection::class);
    }

    public function storing(): HasOne
    {
        return $this->hasOne(MaterialStoring::class, 'receiving_id');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(MaterialDocument::class, 'documentable');
    }
}
