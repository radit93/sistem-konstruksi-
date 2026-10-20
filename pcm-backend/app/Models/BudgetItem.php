<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BudgetItem extends Model
{
    protected $fillable = [
        'project_id',
        'item_code',
        'category',
        'scope_description',
        'unit',
        'contract_qty',
        'unit_price',
        'labor_cost',
        'equipment_cost',
        'consumable_cost',
        'total_budget',
        'actual_cost',
        'currency',
        'department_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
