<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    public function index()
    {
        return Department::withCount('users')
            ->orderBy('sort')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        return response()->json(Department::create($data), 201);
    }

    public function update(Request $request, Department $department)
    {
        $data = $this->validated($request, $department);
        $department->update($data);

        return response()->json($department->loadCount('users'));
    }

    public function destroy(Department $department)
    {
        $count = $department->users()->count();

        if ($count > 0) {
            return response()->json([
                'message' => "Departemen {$department->name} masih dipakai {$count} user. Pindahkan user-nya dulu.",
            ], 422);
        }

        $department->delete();

        return response()->json(['message' => 'OK']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Department $department = null): array
    {
        $data = $request->validate([
            'code' => [
                'required', 'string', 'max:32', 'regex:/^[A-Z0-9_]+$/',
                Rule::unique('departments', 'code')->ignore($department?->id),
            ],
            'name' => ['required', 'string', 'max:120'],
            'sort' => ['nullable', 'integer', 'min:0', 'max:999'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $data['code'] = strtoupper($data['code']);

        return $data;
    }
}
