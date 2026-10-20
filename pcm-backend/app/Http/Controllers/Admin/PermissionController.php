<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    public function index()
    {
        return Permission::orderBy('sort')->get();
    }

    public function forRole(Role $role)
    {
        return response()->json([
            'role' => $role->only('id', 'code', 'name', 'is_system'),
            'permissions' => $role->permissions()->pluck('code')->values(),
        ]);
    }

    public function sync(Request $request, Role $role)
    {
        if ($role->code === \App\Support\AccessCatalog::SUPERADMIN) {
            return response()->json([
                'message' => 'Super Admin selalu punya semua izin dan tidak bisa dibatasi.',
            ], 422);
        }

        $data = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', 'exists:permissions,code'],
        ]);

        $ids = Permission::whereIn('code', $data['permissions'])->pluck('id');
        $role->permissions()->sync($ids);

        return response()->json([
            'role' => $role->code,
            'permissions' => $role->permissions()->pluck('code')->values(),
        ]);
    }
}
