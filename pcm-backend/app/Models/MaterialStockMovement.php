<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialStockMovement extends Model
{
    protected $fillable = [
        'project_id',
        'material_storing_id',
        'type',
        'qty',
        'unit',
        'balance_after',
        'reference_type',
        'reference_id',
        'from_location',
        'to_location',
        'notes',
        'department_id',
        'created_by',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'occurred_at' => 'datetime',
        ];
    }

    public function storing(): BelongsTo
    {
        return $this->belongsTo(MaterialStoring::class, 'material_storing_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
