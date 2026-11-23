<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MaterialUnit extends Model { protected $fillable = ['code','name','decimal_precision','is_active']; protected $casts = ['is_active' => 'boolean','decimal_precision' => 'integer']; }
