<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class MaterialStoring extends Model
{
    protected $fillable = [
        'project_id',
        'receiving_id',
        'item_code',
        'line_no',
        'heat_no',
        'mtc_no',
        'item_name',
        'category',
        'material_standard_id',
        'specification',
        'size',
        'schedule_rating',
        'storage_type',
        'location_detail',
        'stock_in',
        'stock_out',
        'balance',
        'status',
        'last_movement_at',
        'unit',
        'min_stock_alert',
        'mapping_doc_url',
        'department_id',
    ];

    protected function casts(): array
    {
        return [
            'stock_in' => 'decimal:2',
            'stock_out' => 'decimal:2',
            'balance' => 'decimal:2',
            'min_stock_alert' => 'decimal:2',
            'last_movement_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function receiving(): BelongsTo
    {
        return $this->belongsTo(MaterialReceiving::class, 'receiving_id');
    }

    public function materialStandard(): BelongsTo
    {
        return $this->belongsTo(MaterialStandard::class);
    }

    public function issuings(): HasMany
    {
        return $this->hasMany(MaterialIssuing::class, 'material_storing_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(MaterialStockMovement::class, 'material_storing_id');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(MaterialDocument::class, 'documentable');
    }
}
