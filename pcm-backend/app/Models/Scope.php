<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Scope extends Model
{
    protected $fillable = [
        'project_id',
        'scope',
        'unit',
        'contract_qty',
        'cumulative_qty',
        'department_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
