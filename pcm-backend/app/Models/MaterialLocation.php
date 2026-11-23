<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MaterialLocation extends Model { protected $fillable = ['code','name','storage_type','area','zone','is_active']; protected $casts = ['is_active' => 'boolean']; }
