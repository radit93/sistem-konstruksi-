<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * One generic controller for nine resources. Writes are gated by permission
 * codes from the database (permission_role), not by role names, so the matrix
 * screen can change them without a deploy.
 *
 * Department scoping: every operational record carries a department_id. A
 * non-superadmin only sees rows from their own department, except where they
 * hold an explicit cross-department permission (QA/QC signing off construction
 * joints). superadmin sees everything.
 */
class CrudController extends Controller
{
    private array $map = [
        'projects' => [\App\Models\Project::class, [
            'create' => 'project.create',
            'update' => 'project.update',
            'delete' => 'project.delete',
        ]],
        'drawings' => [\App\Models\Drawing::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'joints' => [\App\Models\Joint::class, [
            'create' => 'joint.write',
            'update' => 'joint.write',
            'delete' => 'joint.write',
        ]],
        'stock' => [\App\Models\StockMove::class, [
            'create' => 'stock.write',
            'update' => 'stock.write',
            'delete' => 'stock.write',
        ]],
        'inspections' => [\App\Models\Inspection::class, [
            'create' => 'inspection.write',
            'update' => 'inspection.write',
            'delete' => 'inspection.write',
        ]],
        'test-packages' => [\App\Models\TestPackage::class, [
            'create' => 'testpackage.write',
            'update' => 'testpackage.write',
            'delete' => 'testpackage.write',
        ]],
        'hse' => [\App\Models\HseLog::class, [
            'create' => 'hse.write',
            'update' => 'hse.write',
            'delete' => 'hse.write',
        ]],
        'scopes' => [\App\Models\Scope::class, [
            'create' => 'scope.write',
            'update' => 'scope.write',
            'delete' => 'scope.write',
        ]],
        'progress' => [\App\Models\DailyProgress::class, [
            'create' => 'progress.write',
            'update' => 'progress.write',
            'delete' => 'progress.write',
        ]],
        'daily-progress' => [\App\Models\DailyProgress::class, [
            'create' => 'progress.write',
            'update' => 'progress.write',
            'delete' => 'progress.write',
        ]],
        'line-services' => [\App\Models\LineService::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'material-standards' => [\App\Models\MaterialStandard::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'welding-maps' => [\App\Models\WeldingMap::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'bill-of-materials' => [\App\Models\BillOfMaterial::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'engineering-boqs' => [\App\Models\EngineeringBoq::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'document-controls' => [\App\Models\DocumentControl::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'project-milestones' => [\App\Models\ProjectMilestone::class, [
            'create' => 'scope.write',
            'update' => 'scope.write',
            'delete' => 'scope.write',
        ]],
        'budget-items' => [\App\Models\BudgetItem::class, [
            'create' => 'scope.write',
            'update' => 'scope.write',
            'delete' => 'scope.write',
        ]],
    ];

    /**
     * Resources that carry a department_id. projects is deliberately absent:
     * a project is job-wide, not owned by one department.
     */
    private array $departmentScoped = [
        'drawings', 'joints', 'stock', 'inspections', 'test-packages',
        'hse', 'scopes', 'progress', 'daily-progress',
        'line-services', 'material-standards', 'welding-maps',
        'bill-of-materials', 'engineering-boqs', 'document-controls',
        'project-milestones', 'budget-items',
    ];

    /**
     * Resource => permission that lifts the department filter for that resource.
     */
    private array $crossDepartment = [
        'joints' => 'joint.cross',
    ];

    /**
     * Owning department per resource, used when superadmin creates a row while
     * no department filter is active. Without this the row would be invisible
     * to every operational role.
     */
    private array $defaultOwner = [
        'drawings' => 'ENG',
        'joints' => 'CONS',
        'stock' => 'MAT',
        'inspections' => 'QAQC',
        'test-packages' => 'QAQC',
        'hse' => 'HSE',
        'scopes' => 'PMO',
        'progress' => 'PMO',
        'daily-progress' => 'PMO',
        'line-services' => 'ENG',
        'material-standards' => 'ENG',
        'welding-maps' => 'ENG',
        'bill-of-materials' => 'ENG',
        'engineering-boqs' => 'ENG',
        'document-controls' => 'ENG',
        'project-milestones' => 'PMO',
        'budget-items' => 'PMO',
    ];

    private function resolve(string $res): array
    {
        abort_unless(isset($this->map[$res]), 404, 'Resource tidak dikenal');

        return $this->map[$res];
    }

    private function checkWrite(Request $request, string $res, string $action): void
    {
        [$model, $permissions] = $this->resolve($res);
        $permission = $permissions[$action];

        abort_unless(
            $request->user()->hasPermission($permission),
            403,
            'Akses ditolak: butuh izin '.$permission
        );
    }

    /**
     * Superadmin may narrow the whole app to one department from the sidebar.
     * The value arrives as X-Department-Id and is ignored for every other role;
     * an unknown id simply returns no rows, it never widens access.
     */
    private function requestedDepartment(Request $request): ?int
    {
        $value = $request->header('X-Department-Id');

        return is_numeric($value) && (int) $value > 0 ? (int) $value : null;
    }

    private function scope(Request $request, Builder $query, string $res): Builder
    {
        $user = $request->user();

        if (! $user || $user->isSuperAdmin()) {
            if ($user && in_array($res, $this->departmentScoped, true)) {
                $filter = $this->requestedDepartment($request);
                if ($filter !== null) {
                    return $query->where(
                        $query->getModel()->getTable().'.department_id',
                        $filter
                    );
                }
            }

            return $query;
        }
        if (! in_array($res, $this->departmentScoped, true)) {
            return $query;
        }

        $cross = $this->crossDepartment[$res] ?? null;
        if ($cross && $user->hasPermission($cross)) {
            return $query;
        }

        // No department means no rows, never "all rows". A misconfigured user
        // must fail closed.
        if (! $user->department_id) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(
            $query->getModel()->getTable().'.department_id',
            $user->department_id
        );
    }

    public function index(Request $request, string $res)
    {
        [$model] = $this->resolve($res);
        $q = $this->scope($request, $model::query(), $res);

        if ($res === 'joints') {
            $q->with('inspections');
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('drawing_no', 'like', "%{$s}%")
                        ->orWhere('line_no', 'like', "%{$s}%")
                        ->orWhere('spool_no', 'like', "%{$s}%")
                        ->orWhere('welder', 'like', "%{$s}%");
                });
            }
            if ($request->filled('status')) {
                $q->where('status', $request->status);
            }
            if ($request->filled('shop_field')) {
                $q->where('shop_field', $request->shop_field);
            }
        } elseif ($res === 'projects') {
            $q->withCount('drawings');
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('name', 'like', "%{$s}%")
                        ->orWhere('job_no', 'like', "%{$s}%")
                        ->orWhere('client', 'like', "%{$s}%");
                });
            }
        } elseif ($res === 'drawings') {
            $q->with('project');
            if ($request->filled('project_id')) {
                $q->where('project_id', $request->project_id);
            }
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('drawing_no', 'like', "%{$s}%")
                        ->orWhere('line_no', 'like', "%{$s}%")
                        ->orWhere('title', 'like', "%{$s}%")
                        ->orWhere('area', 'like', "%{$s}%");
                });
            }
        } elseif ($request->filled('search')) {
            $s = $request->search;
            $col = $res === 'stock' ? 'description' : 'id';
            $q->where($col, 'like', "%{$s}%");
        }

        // app.jsx memanggil api.get('/x') lalu memakai hasilnya sebagai array langsung.
        return response()->json($q->orderByDesc('id')->get());
    }

    public function show(Request $request, string $res, int $id)
    {
        [$model] = $this->resolve($res);
        $with = $res === 'joints' ? ['inspections'] : [];

        return response()->json(
            $this->scope($request, $model::with($with), $res)->findOrFail($id)
        );
    }

    public function store(Request $request, string $res)
    {
        $this->checkWrite($request, $res, 'create');
        [$model] = $this->resolve($res);

        $data = $request->all();
        if ($res === 'drawings' && $request->hasFile('file')) {
            $path = $request->file('file')->store('drawings', 'public');
            $data['scan_path'] = '/storage/'.$path;
        }

        // Ownership is set by the server, never by the client.
        if ($this->isDepartmentScoped($res)) {
            if ($request->user()->isSuperAdmin()) {
                $filter = $this->requestedDepartment($request);
                if ($filter !== null) {
                    $data['department_id'] = $filter;
                } elseif (empty($data['department_id'])) {
                    // Tanpa filter, baris baru ikut pemilik modulnya supaya
                    // tidak menjadi data yatim yang tak terlihat role lain.
                    $owner = $this->defaultOwner[$res] ?? null;
                    $data['department_id'] = $owner
                        ? Department::where('code', $owner)->value('id')
                        : null;
                }
            } else {
                $data['department_id'] = $request->user()->department_id;
            }
        }

        $obj = $model::create($data);
        if ($res === 'joints') {
            $obj->load('inspections');
        }

        return response()->json($obj, 201);
    }

    public function update(Request $request, string $res, int $id)
    {
        $this->checkWrite($request, $res, 'update');
        [$model] = $this->resolve($res);

        $obj = $this->scope($request, $model::query(), $res)->findOrFail($id);

        $data = $request->all();
        if (! $request->user()->isSuperAdmin()) {
            unset($data['department_id']);
        }

        $obj->update($data);

        return response()->json($obj);
    }

    public function destroy(Request $request, string $res, int $id)
    {
        $this->checkWrite($request, $res, 'delete');
        [$model] = $this->resolve($res);

        $this->scope($request, $model::query(), $res)->findOrFail($id)->delete();

        return response()->json(['message' => 'OK']);
    }

    private function isDepartmentScoped(string $res): bool
    {
        return in_array($res, $this->departmentScoped, true);
    }

    // Ringkasan angka untuk Overview. Angka mengikuti departemen user.
    public function overview(Request $request)
    {
        $joints = $this->scope($request, \App\Models\Joint::query(), 'joints');
        $inspections = $this->scope($request, \App\Models\Inspection::query(), 'inspections');
        $stock = $this->scope($request, \App\Models\StockMove::query(), 'stock');
        $testPackages = $this->scope($request, \App\Models\TestPackage::query(), 'test-packages');
        $hse = $this->scope($request, \App\Models\HseLog::query(), 'hse');
        $scopes = $this->scope($request, \App\Models\Scope::query(), 'scopes');
        $daily = $this->scope($request, \App\Models\DailyProgress::query(), 'daily-progress');

        $total = (clone $joints)->count();
        $by = (clone $joints)->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');
        $ndtFail = (clone $inspections)->where('result', 'FAIL')->count();
        $ndtTotal = (clone $inspections)->count();

        return response()->json([
            'joints_total' => $total,
            'joints_by_status' => $by,
            'scopes' => (clone $scopes)->get(),
            'daily' => (clone $daily)->orderBy('prog_date')->get(),
            'ndt_reject_pct' => $ndtTotal ? round($ndtFail / $ndtTotal * 100, 1) : 0,
            'stock_alerts' => (clone $stock)->selectRaw("description, spec, SUM(CASE WHEN kind='IN' THEN qty ELSE -qty END) bal")
                ->groupBy('description', 'spec')->havingRaw('bal < 1')->get(),
            'test_ready' => (clone $testPackages)->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status'),
            'hse_open' => (clone $hse)->where('status', 'open')->count(),
        ]);
    }
}
