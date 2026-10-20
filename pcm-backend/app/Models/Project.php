<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Project extends Model
{
    protected $fillable = ['name','client','job_no'];
    public function drawings(){return $this->hasMany(Drawing::class);}
}
