<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TestPackage extends Model
{
    protected $fillable = ['pkg_no','system_name','line_no','test_kind','test_pressure_bar','holding_time_min','schedule_date','status','punch_list_open','blinds','blinds_installed','reinstated','department_id'];
}
