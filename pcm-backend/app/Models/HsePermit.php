<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HsePermit extends Model
{
    protected $fillable = [
        'project_id', 'permit_no', 'permit_type', 'work_location', 'line_no',
        'work_scope', 'applicant_name', 'applicant_company', 'valid_from',
        'valid_to', 'jsa_ref', 'status', 'approved_by', 'approved_at',
        'rejection_reason', 'attachment_path', 'notes', 'department_id',
        'created_by',
    ];

    protected $casts = [
        'valid_from' => 'datetime',
        'valid_to' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
