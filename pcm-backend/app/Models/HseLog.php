<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class HseLog extends Model
{
    protected $fillable = ['log_date','kind','description','action_taken','status','department_id'];
}
