<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MaterialCategory extends Model { protected $fillable = ['code','name','default_unit','requires_heat_no','requires_mtc','is_active']; protected $casts = ['is_active' => 'boolean','requires_heat_no' => 'boolean','requires_mtc' => 'boolean']; }
