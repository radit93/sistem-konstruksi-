<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestPackage extends Model
{
    protected $fillable = [
        'project_id', 'pkg_no', 'system_name', 'line_no', 'test_kind',
        'test_pressure_bar', 'holding_time_min', 'schedule_date', 'status',
        'punch_list_open', 'blinds', 'blinds_installed', 'reinstated', 'department_id',
    ];

    protected $casts = [
        'schedule_date' => 'date',
        'test_pressure_bar' => 'decimal:2',
        'holding_time_min' => 'integer',
        'punch_list_open' => 'integer',
        'blinds_installed' => 'boolean',
        'reinstated' => 'boolean',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    /** Joint yang dicakup paket uji ini. */
    public function joints()
    {
        return $this->belongsToMany(Joint::class, 'joint_test_package')
            ->withTimestamps();
    }
}
