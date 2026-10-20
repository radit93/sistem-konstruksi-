<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentControl extends Model
{
    protected $fillable = [
        'project_id',
        'drawing_id',
        'document_no',
        'drawing_no',
        'title',
        'rev_no',
        'status_doc',
        'incoming_date',
        'issued_date',
        'distributed_to',
        'receiver_name',
        'transmittal_no',
        'file_path',
        'remarks',
        'department_id',
    ];

    public function drawing()
    {
        return $this->belongsTo(Drawing::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
