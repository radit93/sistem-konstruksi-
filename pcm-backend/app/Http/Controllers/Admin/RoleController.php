<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        return Role::withCount('users')
            ->with('permissions:id,code')
            ->orderByDesc('level')
            ->orderBy('name')
            ->get()
            ->map(function (Role $role) {
                $role->setAttribute('permission_codes', $role->permissions->pluck('code')->values());
                $role->unsetRelation('permissions');

                return $role;
            });
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:64', 'regex:/^[a-z][a-z0-9_]*$/', 'unique:roles,code'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'level' => ['nullable', 'integer', 'min:0', 'max:999'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,code'],
        ]);

        $role = Role::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'level' => $data['level'] ?? 50,
            'is_system' => false,
        ]);

        $this->syncPermissions($role, $data['permissions'] ?? []);

        return response()->json($role->loadCount('users'), 201);
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate([
            'code' => [
                'sometimes', 'string', 'max:64', 'regex:/^[a-z][a-z0-9_]*$/',
                \Illuminate\Validation\Rule::unique('roles', 'code')->ignore($role->id),
            ],
            'name' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'level' => ['sometimes', 'integer', 'min:0', 'max:999'],
        ]);

        // A system role keeps its key: users.role points at it and the seeders
        // recreate it under that exact code.
        if ($role->is_system) {
            unset($data['code']);
        }

        $role->update($data);

        return response()->json($role->loadCount('users'));
    }

    public function destroy(Role $role)
    {
        if ($role->is_system) {
            return response()->json(['message' => 'Role sistem tidak bisa dihapus.'], 422);
        }

        $count = $role->users()->count();
        if ($count > 0) {
            return response()->json([
                'message' => "Role {$role->name} masih dipakai {$count} user.",
            ], 422);
        }

        $role->permissions()->detach();
        $role->delete();

        return response()->json(['message' => 'OK']);
    }

    /**
     * @param  array<int, string>  $codes
     */
    private function syncPermissions(Role $role, array $codes): void
    {
        $ids = Permission::whereIn('code', $codes)->pluck('id');
        $role->permissions()->sync($ids);
    }
}
