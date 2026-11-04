<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PipingClassTemplate extends Model
{
    protected $fillable = [
        'piping_class',
        'component_type',
        'description',
        'default_rating_sch',
        'material_spec',
        'material_standard_id',
        'unit',
        'ratio_formula',
        'basis',
        'department_id',
    ];

    public function materialStandard(): BelongsTo
    {
        return $this->belongsTo(MaterialStandard::class);
    }

    /**
     * Normalisasi kode class agar "a1a" dan "A1A" merujuk template yang sama.
     */
    protected function pipingClass(): Attribute
    {
        return Attribute::make(
            set: fn (string $value): string => strtoupper(trim($value)),
        );
    }
}
