<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class MaterialIssuing extends Model
{
    protected $fillable = [
        'project_id',
        'drawing_id',
        'bom_id',
        'material_storing_id',
        'material_standard_id',
        'issue_date',
        'issue_no',
        'requestor',
        'vendor',
        'target_spool_no',
        'target_line_no',
        'drawing_no',
        'item_name',
        'description',
        'specification',
        'size',
        'schedule_rating',
        'qty',
        'unit',
        'heat_no',
        'issued_by',
        'status',
        'cancelled_at',
        'remarks',
        'department_id',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'qty' => 'decimal:2',
            'cancelled_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function storing(): BelongsTo
    {
        return $this->belongsTo(MaterialStoring::class, 'material_storing_id');
    }

    public function drawing(): BelongsTo
    {
        return $this->belongsTo(Drawing::class);
    }

    public function bom(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class, 'bom_id');
    }

    public function materialStandard(): BelongsTo
    {
        return $this->belongsTo(MaterialStandard::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(MaterialDocument::class, 'documentable');
    }
}
