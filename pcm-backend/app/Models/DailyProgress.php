<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DailyProgress extends Model
{
    protected $fillable = ['prog_date','scope','qty','team','department_id'];
}
