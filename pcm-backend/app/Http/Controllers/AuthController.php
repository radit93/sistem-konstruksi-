<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required']);
        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Email atau password salah'], 401);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Akun dinonaktifkan. Hubungi Super Admin.'], 403);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'token' => $user->createToken('pcm')->plainTextToken,
            'user' => $this->payload($user),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($this->payload($request->user()));
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'OK']);
    }

    /**
     * Shape consumed by the frontend: identity, department, and the permission
     * list that decides which menus and buttons render.
     *
     * @return array<string, mixed>
     */
    private function payload(User $user): array
    {
        $user->loadMissing('department', 'roleModel');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'role_name' => $user->roleModel?->name ?? $user->role,
            'is_superadmin' => $user->isSuperAdmin(),
            'department' => $user->department?->only('id', 'code', 'name'),
            'permissions' => $user->permissionCodes(),
        ];
    }
}
