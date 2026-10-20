<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialIssuing extends Model
{
    protected $fillable = [
        'project_id',
        'issue_date',
        'issue_no',
        'requestor',
        'target_spool_no',
        'target_line_no',
        'drawing_no',
        'item_name',
        'specification',
        'size',
        'qty',
        'unit',
        'heat_no',
        'issued_by',
        'remarks',
        'department_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
