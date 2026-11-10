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
        'fitting_catalog_id',
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

    public function fittingCatalog(): BelongsTo
    {
        return $this->belongsTo(FittingCatalog::class);
    }

    public function issuings(): HasMany
    {
        return $this->hasMany(MaterialIssuing::class, 'bom_id');
    }
}
