<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HseHazard extends Model
{
    protected $fillable = [
        'project_id', 'hazard_no', 'found_date', 'location', 'category',
        'severity', 'description', 'photo_before', 'pic_user_id', 'pic_name',
        'pic_company', 'pic_department_id', 'due_date', 'corrective_action',
        'photo_after', 'verified_by', 'verified_at', 'verification_note',
        'status', 'reported_by', 'reporter_name', 'reporter_company',
        'reporter_department_id', 'is_anonymous', 'department_id',
    ];

    protected $casts = [
        'found_date' => 'date',
        'due_date' => 'date',
        'verified_at' => 'datetime',
        'is_anonymous' => 'boolean',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function pic()
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function picDepartment()
    {
        return $this->belongsTo(Department::class, 'pic_department_id');
    }
}
