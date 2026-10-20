<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Inspection extends Model
{
    protected $fillable = ['joint_id','kind','result','defect_type','report_no','insp_date','inspector','photo_path','remarks','department_id'];
    public function joint(){return $this->belongsTo(Joint::class);}
}
