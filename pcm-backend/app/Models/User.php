<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\AccessCatalog;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'department_id', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Permission codes are looked up once per request; admin screens and the
     * CRUD guard both ask for them several times.
     *
     * @var array<int, string>|null
     */
    private ?array $permissionCache = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * `role` is a string key into roles.code, so the relation is declared
     * explicitly. It is named roleModel to avoid clashing with the attribute.
     */
    public function roleModel(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role', 'code');
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === AccessCatalog::SUPERADMIN;
    }

    /**
     * @return array<int, string>
     */
    public function permissionCodes(): array
    {
        if ($this->isSuperAdmin()) {
            return ['*'];
        }

        if ($this->permissionCache === null) {
            $this->permissionCache = Permission::query()
                ->join('permission_role', 'permissions.id', '=', 'permission_role.permission_id')
                ->join('roles', 'roles.id', '=', 'permission_role.role_id')
                ->where('roles.code', $this->role)
                ->orderBy('permissions.sort')
                ->pluck('permissions.code')
                ->all();
        }

        return $this->permissionCache;
    }

    public function hasPermission(string $code): bool
    {
        return $this->isSuperAdmin()
            || in_array($code, $this->permissionCodes(), true);
    }
}
