<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AccessCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['department:id,code,name', 'roleModel:id,code,name'])->orderBy('name');

        if ($request->filled('q')) {
            $q = $request->input('q');
            $query->where(function ($inner) use ($q) {
                $inner->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }
        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->input('department_id'));
        }
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return $query->get()->map(fn (User $user) => $this->present($user));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', 'exists:roles,code'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);

        return response()->json($this->present($user->load('department', 'roleModel')), 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['sometimes', 'string', 'exists:roles,code'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $guard = $this->guardSuperAdmin(
            $request,
            $user,
            $data['role'] ?? null,
            array_key_exists('is_active', $data) ? (bool) $data['is_active'] : null,
        );
        if ($guard) {
            return $guard;
        }

        $user->update($data);

        return response()->json($this->present($user->load('department', 'roleModel')));
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Tidak bisa menghapus akun sendiri.'], 422);
        }

        if ($user->isSuperAdmin()) {
            $remaining = User::where('role', AccessCatalog::SUPERADMIN)
                ->whereKeyNot($user->id)->count();

            if ($remaining === 0) {
                return response()->json(['message' => 'Super Admin terakhir tidak bisa dihapus.'], 422);
            }
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'OK']);
    }

    public function resetPassword(Request $request, User $user)
    {
        $data = $request->validate(['password' => ['required', 'string', 'min:8']]);

        $user->forceFill(['password' => Hash::make($data['password'])])->save();
        $user->tokens()->delete();

        return response()->json(['message' => 'Password diperbarui, sesi lama dicabut.']);
    }

    public function assignRole(Request $request, User $user)
    {
        $data = $request->validate(['role' => ['required', 'string', 'exists:roles,code']]);

        $guard = $this->guardSuperAdmin($request, $user, $data['role'], null);
        if ($guard) {
            return $guard;
        }

        $user->update(['role' => $data['role']]);

        return response()->json($this->present($user->load('department', 'roleModel')));
    }

    /**
     * No self-lockout and no empty chair: the last active superadmin cannot be
     * demoted, deactivated or deleted.
     */
    private function guardSuperAdmin(Request $request, User $user, ?string $newRole, ?bool $newActive): ?JsonResponse
    {
        if (! $user->isSuperAdmin()) {
            return null;
        }

        $demotes = $newRole !== null && $newRole !== AccessCatalog::SUPERADMIN;
        $deactivates = $newActive === false;

        if (! $demotes && ! $deactivates) {
            return null;
        }

        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Tidak bisa menurunkan atau menonaktifkan akun sendiri.',
            ], 422);
        }

        $remaining = User::where('role', AccessCatalog::SUPERADMIN)
            ->where('is_active', true)
            ->whereKeyNot($user->id)
            ->count();

        if ($remaining === 0) {
            return response()->json([
                'message' => 'Super Admin terakhir tidak bisa diturunkan atau dinonaktifkan.',
            ], 422);
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'role_name' => $user->roleModel?->name ?? $user->role,
            'department' => $user->department?->only('id', 'code', 'name'),
            'is_active' => (bool) $user->is_active,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
