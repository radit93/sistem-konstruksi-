<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Scope extends Model
{
    protected $fillable = ['scope','unit','contract_qty','cumulative_qty','department_id'];
}
