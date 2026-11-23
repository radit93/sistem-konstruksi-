<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialAdjustment extends Model
{
    protected $fillable = [
        'project_id', 'material_storing_id', 'adjustment_no', 'qty_delta',
        'balance_before', 'balance_after', 'reason', 'notes', 'status',
        'requested_by', 'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return ['qty_delta' => 'decimal:2', 'balance_before' => 'decimal:2', 'balance_after' => 'decimal:2', 'approved_at' => 'datetime'];
    }

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function storing(): BelongsTo { return $this->belongsTo(MaterialStoring::class, 'material_storing_id'); }
}
