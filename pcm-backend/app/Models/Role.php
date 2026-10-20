<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $fillable = ['code', 'name', 'description', 'level', 'is_system'];

    protected $casts = ['is_system' => 'boolean', 'level' => 'integer'];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    /**
     * users.role stores the role code, not the id.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'role', 'code');
    }
}
