<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EngineeringBoq extends Model
{
    protected $fillable = [
        'project_id',
        'drawing_id',
        'line_no',
        'item_code',
        'work_scope',
        'material_group',
        'dia_inch_total',
        'rate_per_di',
        'joints_count',
        'spools_count',
        'weight_kg',
        'welding_cost_total',
        'total_amount',
        'status',
        'department_id',
    ];

    protected $casts = [
        'dia_inch_total' => 'float',
        'rate_per_di' => 'float',
        'joints_count' => 'integer',
        'spools_count' => 'integer',
        'weight_kg' => 'float',
        'welding_cost_total' => 'float',
        'total_amount' => 'float',
    ];

    protected static function booted(): void
    {
        static::saving(function (EngineeringBoq $boq) {
            if ($boq->rate_per_di > 0 && empty($boq->total_amount)) {
                $boq->total_amount = round(
                    ((float) $boq->dia_inch_total * (float) $boq->rate_per_di) + (float) $boq->welding_cost_total,
                    2
                );
            }
        });
    }

    public function drawing()
    {
        return $this->belongsTo(Drawing::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
