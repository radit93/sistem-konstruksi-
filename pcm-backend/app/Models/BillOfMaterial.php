<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillOfMaterial extends Model
{
    protected $fillable = [
        'project_id',
        'drawing_id',
        'material_standard_id',
        'spool_no',
        'item_no',
        'component_type',
        'description',
        'size',
        'rating_sch',
        'material_spec',
        'qty',
        'unit',
        'od_mm',
        'wall_mm',
        'weight_kg',
        'tag_number',
        'department_id',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'od_mm' => 'decimal:2',
            'wall_mm' => 'decimal:2',
            'weight_kg' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (BillOfMaterial $bom) {
            if (empty($bom->item_no)) {
                $count = BillOfMaterial::where('drawing_id', $bom->drawing_id)->count();
                $bom->item_no = (string) ($count + 1);
            }
            if (empty($bom->description)) {
                $bom->description = trim(($bom->component_type ?? 'Component').' '.($bom->size ?? '').' '.($bom->rating_sch ?? ''));
            }
        });
    }

    public function drawing(): BelongsTo
    {
        return $this->belongsTo(Drawing::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function materialStandard(): BelongsTo
    {
        return $this->belongsTo(MaterialStandard::class);
    }

    public function issuings(): HasMany
    {
        return $this->hasMany(MaterialIssuing::class, 'bom_id');
    }
}
