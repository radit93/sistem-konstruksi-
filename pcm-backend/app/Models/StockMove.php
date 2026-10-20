<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class StockMove extends Model
{
    protected $fillable = ['move_date','kind','description','spec','size','qty','unit','requestor','location','heat_no','po_no','department_id'];
}
