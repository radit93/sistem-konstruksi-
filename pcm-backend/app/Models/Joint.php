<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Joint extends Model
{
    protected $fillable = ['drawing_no','line_no','spool_no','seq','item_a','spec_a','item_b','spec_b','size_in','shop_field','joint_type','method','wps','welder','fit_date','weld_date','visual','status','department_id'];
    public function inspections(){return $this->hasMany(Inspection::class);}
}
