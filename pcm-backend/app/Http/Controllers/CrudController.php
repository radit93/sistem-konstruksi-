<?php

namespace App\Http\Controllers;

use App\Models\BillOfMaterial;
use App\Models\BudgetItem;
use App\Models\DailyProgress;
use App\Models\Department;
use App\Models\DocumentControl;
use App\Models\Drawing;
use App\Models\EngineeringBoq;
use App\Models\FittingCatalog;
use App\Models\FittingStandard;
use App\Models\HseLog;
use App\Models\Inspection;
use App\Models\Joint;
use App\Models\LineService;
use App\Models\MaterialInspection;
use App\Models\MaterialIssuing;
use App\Models\MaterialReceiving;
use App\Models\MaterialStandard;
use App\Models\MaterialStoring;
use App\Models\MilestoneActivity;
use App\Models\PipeSchedule;
use App\Models\PipeStandard;
use App\Models\PipingClassTemplate;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectMilestone;
use App\Models\Scope;
use App\Models\StockMove;
use App\Models\SystemParameter;
use App\Models\TestPackage;
use App\Models\WeldingMap;
use App\Services\MaterialFlowService;
use App\Services\MaterialRequirementService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

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
    public function __construct(
        private readonly MaterialFlowService $materialFlow,
        private readonly MaterialRequirementService $materialRequirements
    ) {}

    private array $map = [
        'projects' => [Project::class, [
            'create' => 'project.create',
            'update' => 'project.update',
            'delete' => 'project.delete',
        ]],
        'drawings' => [Drawing::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'joints' => [Joint::class, [
            'create' => 'joint.write',
            'update' => 'joint.write',
            'delete' => 'joint.write',
        ]],
        'stock' => [StockMove::class, [
            'create' => 'stock.write',
            'update' => 'stock.write',
            'delete' => 'stock.write',
        ]],
        'inspections' => [Inspection::class, [
            'create' => 'inspection.write',
            'update' => 'inspection.write',
            'delete' => 'inspection.write',
        ]],
        'test-packages' => [TestPackage::class, [
            'create' => 'testpackage.write',
            'update' => 'testpackage.write',
            'delete' => 'testpackage.write',
        ]],
        'hse' => [HseLog::class, [
            'create' => 'hse.write',
            'update' => 'hse.write',
            'delete' => 'hse.write',
        ]],
        'scopes' => [Scope::class, [
            'create' => 'scope.write',
            'update' => 'scope.write',
            'delete' => 'scope.write',
        ]],
        'progress' => [DailyProgress::class, [
            'create' => 'progress.write',
            'update' => 'progress.write',
            'delete' => 'progress.write',
        ]],
        'daily-progress' => [DailyProgress::class, [
            'create' => 'progress.write',
            'update' => 'progress.write',
            'delete' => 'progress.write',
        ]],
        'line-services' => [LineService::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'material-standards' => [MaterialStandard::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'fitting-catalogs' => [FittingCatalog::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'fitting-standards' => [FittingStandard::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'pipe-standards' => [PipeStandard::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'system-parameters' => [SystemParameter::class, [
            'create' => 'project.create',
            'update' => 'project.update',
            'delete' => 'project.delete',
        ]],
        'piping-class-templates' => [PipingClassTemplate::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'pipe-schedules' => [PipeSchedule::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'welding-maps' => [WeldingMap::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'bill-of-materials' => [BillOfMaterial::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'engineering-boqs' => [EngineeringBoq::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'document-controls' => [DocumentControl::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
        ]],
        'project-milestones' => [ProjectMilestone::class, [
            'create' => 'milestone.write',
            'update' => 'milestone.write',
            'delete' => 'milestone.write',
        ]],
        'project-members' => [ProjectMember::class, [
            'create' => 'scope.write',
            'update' => 'scope.write',
            'delete' => 'scope.write',
        ]],
        'budget-items' => [BudgetItem::class, [
            'create' => 'scope.write',
            'update' => 'scope.write',
            'delete' => 'scope.write',
        ]],
        'material-receivings' => [MaterialReceiving::class, [
            'create' => 'stock.write',
            'update' => 'stock.write',
            'delete' => 'stock.write',
        ]],
        'material-inspections' => [MaterialInspection::class, [
            'create' => 'material_inspection.write',
            'update' => 'material_inspection.write',
            'delete' => 'material_inspection.write',
        ]],
        'material-storings' => [MaterialStoring::class, [
            'create' => 'stock.write',
            'update' => 'stock.write',
            'delete' => 'stock.write',
        ]],
        'material-issuings' => [MaterialIssuing::class, [
            'create' => 'stock.write',
            'update' => 'stock.write',
            'delete' => 'stock.write',
        ]],
    ];

    /**
     * Resources that carry a department_id. projects is deliberately absent:
     * a project is job-wide, not owned by one department.
     */
    private array $departmentScoped = [
        'drawings', 'joints', 'stock', 'inspections', 'test-packages',
        'hse', 'scopes', 'progress', 'daily-progress',
        'line-services', 'material-standards', 'pipe-standards', 'welding-maps',
        'bill-of-materials', 'engineering-boqs', 'document-controls',
        'project-milestones', 'budget-items',
        'material-receivings', 'material-inspections', 'material-storings', 'material-issuings',
    ];

    /**
     * Master data shared across the company. Read access is never narrowed to
     * the user's department, but the row still keeps its owning department for
     * audit and for deciding who is allowed to write it.
     */
    private array $companyWide = [
        'material-standards',
        'pipe-standards',
        'line-services',
        'system-parameters',
    ];

    /**
     * Resource => permission that lifts the department filter for that resource.
     */
    private array $crossDepartment = [
        'joints' => 'joint.cross',
        // Material Control perlu membaca master Engineering (drawing, katalog
        // standar, BOM) untuk mencocokkan requirement dengan stok. Hak tulis
        // tetap dijaga permission drawing.write di checkWrite().
        'drawings' => ['stock.view', 'inspection.view', 'joint.view'],
        'welding-maps' => ['stock.view', 'inspection.view', 'joint.view'],
        'material-standards' => 'stock.view',
        'bill-of-materials' => 'stock.view',
        'material-receivings' => 'material_inspection.write',
        'material-inspections' => 'material_inspection.write',
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
        'pipe-standards' => 'ENG',
        'welding-maps' => 'ENG',
        'bill-of-materials' => 'ENG',
        'engineering-boqs' => 'ENG',
        'document-controls' => 'ENG',
        'project-milestones' => 'PMO',
        'budget-items' => 'PMO',
        'material-receivings' => 'MAT',
        'material-inspections' => 'MAT',
        'material-storings' => 'MAT',
        'material-issuings' => 'MAT',
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

    private function checkRead(Request $request, string $res): void
    {
        $permission = match ($res) {
            'material-inspections' => 'material_inspection.view',
            'material-receivings', 'material-storings', 'material-issuings' => 'stock.view',
            default => null,
        };

        if ($permission !== null) {
            abort_unless(
                $request->user()?->hasPermission($permission),
                403,
                'Akses ditolak: butuh izin '.$permission
            );
        }
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

        // Material and pipe standards are company-wide reference data. Every
        // authenticated department reads the same rows so Engineering's master
        // data can be used by Material, Construction, QA/QC, etc.
        if (in_array($res, $this->companyWide, true)) {
            return $query;
        }

        if (! $user || $user->isSuperAdmin() || $user->role === 'project_manager') {
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
        if ($res === 'project-members') {
            return $query->where('project_members.user_id', $user->id);
        }
        if (! in_array($res, $this->departmentScoped, true)) {
            return $query;
        }

        $cross = $this->crossDepartment[$res] ?? null;
        if ($cross) {
            $allowed = is_array($cross)
                ? collect($cross)->some(fn ($permission) => $user->hasPermission($permission))
                : $user->hasPermission($cross);
            if ($allowed) {
                return $query;
            }
        }

        // Untuk project-milestones, setiap akun operasional hanya mengelola milestonenya sendiri
        // (PM & Superadmin melihat seluruh akun lintas departemen di cabang kondisi atas).
        if ($res === 'project-milestones') {
            return $query->where($query->getModel()->getTable().'.user_id', $user->id);
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
        $this->checkRead($request, $res);
        [$model] = $this->resolve($res);
        $q = $this->scope($request, $model::query(), $res);

        if ($res === 'fitting-standards') {
            // Master fitting dipisah ke tabel dedicated (fitting_standards);
            // select ringan hanya memuat kolom yang ditampilkan di UI.
            // Kolom panjang (source_reference, material_ss, secondary)
            // tetap di exclude agar payload tetap ringan (~1 MB untuk 2.303 baris).
            $q->select([
                'id', 'item_code', 'category', 'fitting_type', 'asme_standard',
                'connection', 'nps_main', 'nps_secondary', 'schedule_class',
                'material_cs', 'dimension_primary_mm', 'weight_cs_kg',
            ]);
        }

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
        } elseif ($res === 'bill-of-materials') {
            $q->with(['materialStandard', 'drawing']);
            if ($request->filled('drawing_id')) {
                $q->where('drawing_id', $request->drawing_id);
            }
            if ($request->filled('project_id')) {
                $q->where('project_id', $request->project_id);
            }
            if ($request->filled('spool_no')) {
                $q->where('spool_no', $request->spool_no);
            }
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('description', 'like', "%{$s}%")
                        ->orWhere('component_type', 'like', "%{$s}%")
                        ->orWhere('material_spec', 'like', "%{$s}%")
                        ->orWhere('spool_no', 'like', "%{$s}%")
                        ->orWhere('tag_number', 'like', "%{$s}%")
                        ->orWhereHas('materialStandard', fn ($standard) => $standard->where('code', 'like', "%{$s}%"));
                });
            }
        } elseif ($res === 'engineering-boqs') {
            $q->with('drawing');
            if ($request->filled('project_id')) {
                $q->where('project_id', $request->project_id);
            }
            if ($request->filled('drawing_id')) {
                $q->where('drawing_id', $request->drawing_id);
            }
        } elseif ($res === 'material-receivings') {
            $q->with(['storing', 'inspections', 'materialStandard', 'documents']);
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('shipment_no', 'like', "%{$s}%")
                        ->orWhere('po_no', 'like', "%{$s}%")
                        ->orWhere('vendor', 'like', "%{$s}%")
                        ->orWhere('item_name', 'like', "%{$s}%")
                        ->orWhere('heat_no', 'like', "%{$s}%")
                        ->orWhere('line_no', 'like', "%{$s}%")
                        ->orWhereHas('materialStandard', fn ($standard) => $standard->where('code', 'like', "%{$s}%"));
                });
            }
        } elseif ($res === 'material-inspections') {
            $q->with('receiving.materialStandard');
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('report_no', 'like', "%{$s}%")
                        ->orWhere('inspector_name', 'like', "%{$s}%")
                        ->orWhere('item_name', 'like', "%{$s}%")
                        ->orWhere('heat_no', 'like', "%{$s}%")
                        ->orWhere('ncr_no', 'like', "%{$s}%");
                });
            }
        } elseif ($res === 'material-storings') {
            $q->with(['receiving', 'materialStandard', 'documents'])->where('status', '!=', 'VOID');
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('item_code', 'like', "%{$s}%")
                        ->orWhere('item_name', 'like', "%{$s}%")
                        ->orWhere('heat_no', 'like', "%{$s}%")
                        ->orWhere('line_no', 'like', "%{$s}%")
                        ->orWhere('specification', 'like', "%{$s}%")
                        ->orWhereHas('materialStandard', fn ($standard) => $standard->where('code', 'like', "%{$s}%"));
                });
            }
        } elseif ($res === 'material-issuings') {
            $q->with(['storing', 'materialStandard', 'drawing', 'bom', 'documents'])->where('status', '!=', 'CANCELLED');
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('issue_no', 'like', "%{$s}%")
                        ->orWhere('requestor', 'like', "%{$s}%")
                        ->orWhere('item_name', 'like', "%{$s}%")
                        ->orWhere('heat_no', 'like', "%{$s}%")
                        ->orWhere('target_spool_no', 'like', "%{$s}%")
                        ->orWhere('drawing_no', 'like', "%{$s}%")
                        ->orWhereHas('materialStandard', fn ($standard) => $standard->where('code', 'like', "%{$s}%"));
                });
            }
        } elseif ($res === 'project-milestones') {
            $q->with(['user:id,name,email,role', 'project:id,job_no,name,client', 'activities']);
        } elseif ($res === 'project-members') {
            $q->with(['user:id,name,email,role', 'project:id,job_no,name,client', 'assignedBy:id,name']);
        } elseif ($request->filled('search')) {
            $s = $request->search;
            $col = $res === 'stock' ? 'description' : 'id';
            $q->where($col, 'like', "%{$s}%");
        }

        if ($request->filled('project_id') && Schema::hasColumn($q->getModel()->getTable(), 'project_id')) {
            $q->where($q->getModel()->getTable().'.project_id', $request->project_id);
        }

        // app.jsx memanggil api.get('/x') lalu memakai hasilnya sebagai array langsung.
        return response()->json($q->orderByDesc('id')->get());
    }

    public function show(Request $request, string $res, int $id)
    {
        $this->checkRead($request, $res);
        [$model] = $this->resolve($res);
        $with = match ($res) {
            'joints' => ['inspections'],
            'bill-of-materials' => ['materialStandard', 'drawing'],
            'material-receivings' => ['storing', 'inspections', 'materialStandard', 'documents.uploader:id,name'],
            'material-inspections' => ['receiving.materialStandard'],
            'material-storings' => ['movements.creator', 'receiving', 'materialStandard', 'documents.uploader:id,name'],
            'material-issuings' => ['storing', 'materialStandard', 'drawing', 'bom', 'documents.uploader:id,name'],
            'project-milestones' => ['user:id,name,email,role', 'project:id,job_no,name,client', 'activities'],
            'project-members' => ['user:id,name,email,role', 'project:id,job_no,name,client', 'assignedBy:id,name'],
            default => [],
        };

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
        if ($res === 'drawings' && isset($data['fitup_specs']) && is_string($data['fitup_specs'])) {
            $data['fitup_specs'] = json_decode($data['fitup_specs'], true);
        }
        if ($res === 'drawings' && isset($data['spool_data']) && is_string($data['spool_data'])) {
            $data['spool_data'] = json_decode($data['spool_data'], true);
        }

        if ($res === 'piping-class-templates') {
            $duplicate = PipingClassTemplate::query()
                ->where('piping_class', strtoupper(trim((string) ($data['piping_class'] ?? ''))))
                ->where('component_type', trim((string) ($data['component_type'] ?? '')))
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'component_type' => 'Komponen ini sudah ada pada piping class tersebut; ubah baris yang sudah ada.',
                ]);
            }
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

        if (in_array($res, ['material-receivings', 'material-storings', 'material-issuings'], true)
            && empty($data['project_id'])) {
            throw ValidationException::withMessages([
                'project_id' => 'Project wajib dipilih untuk transaksi material.',
            ]);
        }

        if (in_array($res, ['material-receivings', 'material-storings', 'material-issuings'], true)) {
            $data['project_id'] = Project::query()->whereKey($data['project_id'])->exists()
                ? (int) $data['project_id']
                : throw ValidationException::withMessages([
                    'project_id' => 'Project tidak ditemukan.',
                ]);
        }

        if ($res === 'material-receivings') {
            $data['status'] = 'RECEIVED';
            unset($data['inspection_requested_at'], $data['stocked_at'], $data['accepted_qty']);
        }

        if ($res === 'material-storings') {
            if (! empty($data['receiving_id'])) {
                throw ValidationException::withMessages([
                    'receiving_id' => 'Stok dari receiving dibuat otomatis lewat inspeksi QC.',
                ]);
            }

            $stockIn = (float) ($data['stock_in'] ?? 0);
            $stockOut = (float) ($data['stock_out'] ?? 0);

            if ($stockOut > $stockIn) {
                throw ValidationException::withMessages([
                    'stock_out' => 'Stock out tidak boleh melebihi stock in.',
                ]);
            }

            $data['balance'] = $stockIn - $stockOut;
            $data['status'] = $data['balance'] > 0 ? 'AVAILABLE' : 'DEPLETED';
            $data['last_movement_at'] = now();
        }

        if ($res === 'material-inspections') {
            if (empty($data['material_receiving_id'])) {
                throw ValidationException::withMessages([
                    'material_receiving_id' => 'Inspeksi material harus ditautkan ke batch penerimaan.',
                ]);
            }

            $receiving = $this->scope($request, MaterialReceiving::query(), 'material-receivings')
                ->find($data['material_receiving_id']);

            if (! $receiving) {
                throw ValidationException::withMessages([
                    'material_receiving_id' => 'Receiving tidak ditemukan.',
                ]);
            }

            if ($receiving->status !== 'REQUESTED') {
                throw ValidationException::withMessages([
                    'material_receiving_id' => 'Receiving belum diminta inspeksi oleh Material Control.',
                ]);
            }

            $data['department_id'] = $receiving->department_id;
            if (! empty($data['project_id']) && (int) $data['project_id'] !== (int) $receiving->project_id) {
                throw ValidationException::withMessages([
                    'project_id' => 'Inspeksi harus berada pada project receiving yang sama.',
                ]);
            }
            $data['project_id'] = $receiving->project_id;
        }

        // QA-QC: Auto-update joint status when inspection passes or fails
        if ($res === 'inspections') {
            $joint = Joint::query()->find($data['joint_id'] ?? null);
            if (! $joint) {
                throw ValidationException::withMessages([
                    'joint_id' => 'Joint wajib dipilih untuk laporan inspeksi.',
                ]);
            }

            // Nomor laporan yang masih berupa placeholder diganti dengan nomor
            // traceable project/drawing/joint/type yang konsisten.
            $reportNo = (string) ($data['report_no'] ?? '');
            if ($reportNo === '' || str_starts_with($reportNo, 'QC-SEQ') || str_starts_with($reportNo, 'QC-VR') || str_starts_with($reportNo, 'AUTO')) {
                $drawing = Drawing::query()->where('drawing_no', $joint->drawing_no)->first();
                $project = $drawing?->project;
                $projectCode = $project?->job_no ?: $project?->code ?: 'PROJECT';
                $drawingCode = strtoupper((string) preg_replace('/[^A-Z0-9]/i', '', $drawing?->drawing_no ?: $joint->drawing_no ?: 'ISO'));
                $kind = strtoupper((string) ($data['kind'] ?? 'VISUAL'));
                $kindCode = in_array($kind, ['RT', 'PT', 'UT', 'PMI'], true) ? $kind : 'VT';
                $count = Inspection::query()->where('joint_id', $joint->id)->where('kind', $kind)->count() + 1;
                $data['report_no'] = sprintf('QC-%s-%s-J%s-%s-%02d', $projectCode, $drawingCode, str_pad((string) ($joint->seq ?: 1), 2, '0', STR_PAD_LEFT), $kindCode, $count);
            }

            $inspection = DB::transaction(function () use ($model, $data) {
                $inspection = $model::create($data);
                $jointId = $inspection->joint_id;

                $inspections = Inspection::where('joint_id', $jointId)->get();
                $newStatus = null;
                if ($inspection->result === 'FAIL') {
                    $newStatus = 'REPAIR';
                } elseif ($inspection->result === 'PASS' && $inspection->kind === 'VISUAL') {
                    $newStatus = 'VISUAL_OK';
                } elseif ($inspection->result === 'PASS' && in_array($inspection->kind, ['RT', 'PT', 'UT'], true)) {
                    $hasVisualPass = $inspections->contains(fn ($item) => $item->kind === 'VISUAL' && $item->result === 'PASS');
                    if ($hasVisualPass) {
                        $newStatus = 'NDT_OK';
                    }
                }

                if ($newStatus !== null) {
                    Joint::whereKey($jointId)->update(['status' => $newStatus]);
                }

                return $inspection->fresh();
            });

            return response()->json($inspection, 201);
        }

        if ($res === 'material-issuings') {
            $obj = $this->materialFlow->createIssuing($data, $request->user());

            return response()->json($obj, 201);
        }

        if ($res === 'material-storings') {
            $obj = DB::transaction(function () use ($model, $data, $request) {
                $stock = $model::create($data);
                $this->materialFlow->recordOpeningStock($stock, $request->user());

                return $stock->refresh();
            });

            return response()->json($obj, 201);
        }

        if ($res === 'drawings') {
            if (isset($data['fitup_specs']) && is_string($data['fitup_specs'])) {
                $data['fitup_specs'] = json_decode($data['fitup_specs'], true);
            }
            if (isset($data['spool_data']) && is_string($data['spool_data'])) {
                $data['spool_data'] = json_decode($data['spool_data'], true);
            }
        }

        if ($res === 'material-inspections') {
            $obj = DB::transaction(function () use ($model, $data, $request) {
                $inspection = $model::create($data);
                $this->materialFlow->applyInspection($inspection, $request->user());

                return $inspection->fresh()->load('receiving');
            });

            return response()->json($obj, 201);
        }

        if ($res === 'bill-of-materials') {
            $data = PipeSchedule::enrichBom($data);
            $data = FittingStandard::enrichBom($data);
        }

        if ($res === 'project-milestones') {
            $activities = is_array($data['activities'] ?? null) ? $data['activities'] : [];
            unset($data['activities']);

            $user = $request->user();
            $isManager = $user->isSuperAdmin() || $user->role === 'project_manager';
            if (! $isManager || empty($data['user_id'])) {
                $data['user_id'] = $user->id;
            }
            if (empty($data['pic_lead'])) {
                $data['pic_lead'] = $user->name;
            }
            if (empty($data['project_role'])) {
                $data['project_role'] = $user->role_name ?? $user->role;
            }

            $obj = DB::transaction(function () use ($model, $data, $activities) {
                $milestone = $model::create($data);
                $this->syncMilestoneActivities($milestone, $activities);

                return $milestone->fresh()->load(['user:id,name,email,role', 'project:id,job_no,name,client', 'activities']);
            });

            return response()->json($obj, 201);
        }

        if ($res === 'project-members') {
            $validated = $request->validate([
                'project_id' => ['required', 'integer', 'exists:projects,id'],
                'user_id' => ['required', 'integer', 'exists:users,id'],
                'project_role' => ['required', 'string', 'max:64'],
                'responsibilities' => ['nullable', 'string'],
                'estimated_days' => ['nullable', 'integer', 'min:1', 'max:365'],
                'status' => ['nullable', 'string', 'max:32'],
            ]);
            $member = ProjectMember::updateOrCreate(
                [
                    'project_id' => $validated['project_id'],
                    'user_id' => $validated['user_id'],
                ],
                [
                    'project_role' => $validated['project_role'],
                    'responsibilities' => $validated['responsibilities'] ?? null,
                    'estimated_days' => $validated['estimated_days'] ?? null,
                    'status' => $validated['status'] ?? 'ACTIVE',
                    'assigned_by' => $request->user()->id,
                ]
            );

            return response()->json(
                $member->fresh()->load(['user:id,name,email,role', 'project:id,job_no,name,client', 'assignedBy:id,name']),
                201
            );
        }

        $obj = $model::create($data);

        if ($res === 'joints') {
            $obj->load('inspections');
        } elseif ($res === 'welding-maps') {
            $this->syncWeldingMapToJoint($obj);
        } elseif ($res === 'drawings') {
            $this->syncFitupSpecsToBom($obj);
        }

        return response()->json($obj, 201);
    }

    public function update(Request $request, string $res, int $id)
    {
        $this->checkWrite($request, $res, 'update');
        [$model] = $this->resolve($res);

        $obj = $this->scope($request, $model::query(), $res)->findOrFail($id);

        $data = $request->all();
        if (in_array($res, ['material-receivings', 'material-storings', 'material-issuings'], true)
            && array_key_exists('project_id', $data)
            && empty($data['project_id'])) {
            throw ValidationException::withMessages([
                'project_id' => 'Project wajib dipilih untuk transaksi material.',
            ]);
        }

        if (in_array($res, ['material-receivings', 'material-storings', 'material-issuings'], true)
            && array_key_exists('project_id', $data)
            && ! Project::query()->whereKey($data['project_id'])->exists()) {
            throw ValidationException::withMessages([
                'project_id' => 'Project tidak ditemukan.',
            ]);
        }
        if ($res === 'joints' && array_key_exists('status', $data)) {
            $this->validateJointStatusTransition($obj, (string) $data['status'], $request->user());
        }
        if ($res === 'drawings' && $request->hasFile('file')) {
            $path = $request->file('file')->store('drawings', 'public');
            $data['scan_path'] = '/storage/'.$path;
        }
        if ($res === 'drawings' && isset($data['fitup_specs']) && is_string($data['fitup_specs'])) {
            $data['fitup_specs'] = json_decode($data['fitup_specs'], true);
        }
        if ($res === 'drawings' && isset($data['spool_data']) && is_string($data['spool_data'])) {
            $data['spool_data'] = json_decode($data['spool_data'], true);
        }
        if (! $request->user()->isSuperAdmin()) {
            unset($data['department_id']);
        }

        if ($res === 'bill-of-materials' && $obj->issuings()->exists()) {
            // BOM yang sudah dipakai issuing tidak boleh berubah identitas/qty:
            // rekonsiliasi kebutuhan vs pengeluaran memakai bom_id ini.
            foreach ([
                'project_id', 'drawing_id', 'material_standard_id', 'spool_no',
                'item_no', 'component_type', 'size', 'material_spec', 'unit',
            ] as $field) {
                if (array_key_exists($field, $data) && (string) $data[$field] !== (string) $obj->{$field}) {
                    throw ValidationException::withMessages([
                        $field => 'BOM sudah dipakai pada pengeluaran material; identitas material tidak bisa diubah.',
                    ]);
                }
            }

            if (array_key_exists('qty', $data) && abs((float) $data['qty'] - (float) $obj->qty) > 0.0001) {
                throw ValidationException::withMessages([
                    'qty' => 'BOM sudah dipakai pada pengeluaran material; qty tidak bisa diubah.',
                ]);
            }
        }

        if ($res === 'material-receivings') {
            unset($data['status'], $data['inspection_requested_at'], $data['stocked_at'], $data['accepted_qty']);

            if ($obj->storing()->where('status', '!=', 'VOID')->exists()) {
                foreach ([
                    'qty', 'unit', 'item_name', 'description', 'specification', 'size',
                    'schedule_rating', 'heat_no', 'category', 'material_standard_id', 'line_no',
                    'storage_type', 'storage_location', 'project_id',
                ] as $field) {
                    if (array_key_exists($field, $data) && (string) $data[$field] !== (string) $obj->{$field}) {
                        throw ValidationException::withMessages([
                            $field => 'Data material sudah masuk stok; perubahan ini harus lewat koreksi stok.',
                        ]);
                    }
                }
            }
        }

        if ($res === 'material-storings') {
            if (array_key_exists('receiving_id', $data) && $data['receiving_id']) {
                $receiving = MaterialReceiving::query()->find($data['receiving_id']);
                if (! $receiving || (int) $receiving->project_id !== (int) $obj->project_id) {
                    throw ValidationException::withMessages([
                        'receiving_id' => 'Receiving harus berasal dari project yang sama dengan stok.',
                    ]);
                }
            }

            foreach (['stock_in', 'stock_out'] as $field) {
                if (array_key_exists($field, $data) && abs((float) $data[$field] - (float) $obj->{$field}) > 0.0001) {
                    throw ValidationException::withMessages([
                        $field => 'Qty stok tidak bisa diubah manual; gunakan issuing, transfer, atau koreksi stok.',
                    ]);
                }
            }

            if ($obj->receiving_id || (float) $obj->stock_out > 0) {
                foreach ([
                    'item_name', 'specification', 'size', 'schedule_rating',
                    'line_no', 'heat_no', 'category', 'material_standard_id', 'unit', 'project_id',
                ] as $field) {
                    if (array_key_exists($field, $data) && (string) $data[$field] !== (string) $obj->{$field}) {
                        throw ValidationException::withMessages([
                            $field => 'Data lot stok sudah terikat receiving/issuing; perubahan ini harus lewat koreksi stok.',
                        ]);
                    }
                }
            }

            unset(
                $data['stock_in'], $data['stock_out'], $data['balance'], $data['status'],
                $data['receiving_id'], $data['item_code']
            );

            $newType = $data['storage_type'] ?? $obj->storage_type;
            $newLocation = $data['location_detail'] ?? $obj->location_detail;
            unset($data['storage_type'], $data['location_detail']);

            $obj->update($data);

            if ($newType !== $obj->storage_type || $newLocation !== $obj->location_detail) {
                $obj = $this->materialFlow->transferStock($obj, $newType, $newLocation, $request->user());
            }

            return response()->json($obj->fresh());
        }

        if ($res === 'material-inspections') {
            if (array_key_exists('material_receiving_id', $data)
                && (int) $data['material_receiving_id'] !== (int) $obj->material_receiving_id) {
                throw ValidationException::withMessages([
                    'material_receiving_id' => 'Receiving tidak bisa diubah; buat laporan inspeksi baru.',
                ]);
            }

            $obj = DB::transaction(function () use ($obj, $data, $request) {
                $obj->update($data);
                $this->materialFlow->applyInspection($obj->fresh(), $request->user());

                return $obj->fresh()->load('receiving');
            });

            return response()->json($obj);
        }

        if ($res === 'material-issuings') {
            $obj = $this->materialFlow->updateIssuing($obj, $data, $request->user());

            return response()->json($obj);
        }

        if ($res === 'bill-of-materials') {
            $data = PipeSchedule::enrichBom($data);
            $data = FittingStandard::enrichBom($data);
        }

        if ($res === 'project-milestones') {
            $user = $request->user();
            $isManager = $user->isSuperAdmin() || $user->role === 'project_manager';
            if (! $isManager && (int) $obj->user_id !== (int) $user->id) {
                abort(403, 'Akses ditolak: hanya pemilik milestone atau Project Manager yang dapat mengubah.');
            }
            if (! $isManager) {
                unset($data['user_id']);
            }

            $hasActivities = array_key_exists('activities', $data) && is_array($data['activities']);
            $activities = $hasActivities ? $data['activities'] : [];
            unset($data['activities']);

            $obj = DB::transaction(function () use ($obj, $data, $hasActivities, $activities) {
                $obj->update($data);
                if ($hasActivities) {
                    $this->syncMilestoneActivities($obj, $activities);
                }

                return $obj->fresh()->load(['user:id,name,email,role', 'project:id,job_no,name,client', 'activities']);
            });

            return response()->json($obj);
        }

        if ($res === 'project-members') {
            $validated = $request->validate([
                'project_role' => ['sometimes', 'string', 'max:64'],
                'responsibilities' => ['nullable', 'string'],
                'estimated_days' => ['nullable', 'integer', 'min:1', 'max:365'],
                'status' => ['sometimes', 'string', 'max:32'],
            ]);
            $obj->update($validated);

            return response()->json(
                $obj->fresh()->load(['user:id,name,email,role', 'project:id,job_no,name,client', 'assignedBy:id,name'])
            );
        }

        $obj->update($data);
        if ($res === 'welding-maps') {
            $this->syncWeldingMapToJoint($obj->fresh());
        } elseif ($res === 'drawings' && isset($data['fitup_specs'])) {
            $this->syncFitupSpecsToBom($obj->fresh());
        }

        return response()->json($obj);
    }

    private function syncFitupSpecsToBom(Drawing $drawing): void
    {
        $specs = $drawing->fitup_specs;
        if (is_string($specs)) {
            $specs = json_decode($specs, true);
        }
        if (! is_array($specs) || empty($specs)) {
            return;
        }

        $standards = MaterialStandard::all();
        $pipeStandards = PipeStandard::all();
        $itemNo = (int) BillOfMaterial::where('drawing_id', $drawing->id)->count();

        foreach ($specs as $index => $spec) {
            $size = trim((string) ($spec['size'] ?? ''));
            $schedule = trim((string) ($spec['schedule'] ?? ''));
            $materialSpec = trim((string) ($spec['material_spec'] ?? ''));
            $compType = ! empty($spec['component_type']) ? trim((string) $spec['component_type']) : 'Pipe';

            if ($size === '' && $schedule === '') {
                continue;
            }

            // Normalisasi pencocokan: format size seperti 4" atau 4
            $normSize = rtrim($size, '"');

            // Cek apakah item serupa sudah ada di BOM drawing ini (berdasarkan tipe, size, dan schedule)
            $existing = BillOfMaterial::where('drawing_id', $drawing->id)
                ->where('component_type', $compType)
                ->where(function ($q) use ($size, $normSize) {
                    $q->where('size', $size)
                        ->orWhere('size', $normSize)
                        ->orWhere('size', $normSize.'"');
                })
                ->where('rating_sch', $schedule)
                ->first();

            if ($existing) {
                // Perbarui jika ada perubahan spesifikasi material
                if ($materialSpec && empty($existing->material_spec)) {
                    $existing->update(['material_spec' => $materialSpec]);
                }

                continue;
            }

            $itemNo++;
            $qty = ! empty($spec['qty']) ? (float) $spec['qty'] : (stripos($compType, 'pipe') !== false ? 6.0 : 1.0);
            $unit = ! empty($spec['unit']) ? $spec['unit'] : (stripos($compType, 'pipe') !== false ? 'meter' : 'buah');

            // Cari estimasi harga satuan
            $unitPrice = match (true) {
                stripos($compType, 'pipe') !== false => 320000,
                stripos($compType, 'elbow') !== false => 185000,
                stripos($compType, 'flange') !== false => 295000,
                stripos($compType, 'valve') !== false => 1850000,
                stripos($compType, 'gasket') !== false => 75000,
                stripos($compType, 'bolt') !== false => 45000,
                default => 150000,
            };

            // Cocokkan ke MaterialStandard
            $matchedStd = $standards->first(function (MaterialStandard $std) use ($materialSpec, $compType) {
                if ($materialSpec && stripos($std->specification, $materialSpec) !== false) {
                    return true;
                }

                return strcasecmp($std->category, $compType) === 0;
            });

            $desc = ! empty($spec['description'])
                ? $spec['description']
                : "{$compType} {$size} {$schedule} {$materialSpec}";

            $bomData = [
                'project_id' => $drawing->project_id,
                'drawing_id' => $drawing->id,
                'material_standard_id' => $matchedStd?->id,
                'spool_no' => $spec['spool_no'] ?? 'SP-01',
                'item_no' => (string) $itemNo,
                'component_type' => $compType,
                'description' => trim($desc),
                'size' => $size,
                'rating_sch' => $schedule,
                'material_spec' => $materialSpec ?: ($matchedStd?->specification ?? 'ASTM A106 Gr. B'),
                'qty' => $qty,
                'unit' => $unit,
                'unit_price' => $unitPrice,
                'total_price' => round($qty * $unitPrice, 2),
                'tag_number' => $spec['tag_number'] ?? null,
                'department_id' => $drawing->department_id,
                'source' => 'FITUP_AUTO',
            ];

            $bomData = PipeSchedule::enrichBom($bomData);
            $bomData = FittingStandard::enrichBom($bomData);

            BillOfMaterial::create($bomData);
        }
    }

    public function destroy(Request $request, string $res, int $id)
    {
        $this->checkWrite($request, $res, 'delete');
        [$model] = $this->resolve($res);

        $obj = $this->scope($request, $model::query(), $res)->findOrFail($id);

        if ($res === 'welding-maps') {
            $jointSeq = null;
            if (preg_match('/(\d+)/', (string) $obj->joint_no, $m)) {
                $jointSeq = (int) $m[1];
            }
            Joint::where('drawing_no', $obj->iso_drawing_no)
                ->where('spool_no', $obj->spool_no)
                ->where('seq', $jointSeq)
                ->delete();
        }

        if ($res === 'material-issuings') {
            $this->materialFlow->cancelIssuing($obj, $request->user());

            return response()->json(['message' => 'OK']);
        }

        if ($res === 'bill-of-materials' && $obj->issuings()->exists()) {
            throw ValidationException::withMessages([
                'bom' => 'BOM sudah dipakai pada pengeluaran material; tidak bisa dihapus.',
            ]);
        }

        if ($res === 'material-inspections') {
            $stock = $obj->receiving?->storing;

            if ($stock && $stock->status !== 'VOID') {
                throw ValidationException::withMessages([
                    'inspection' => 'Laporan inspeksi sudah membuat stok; batalkan stok terlebih dahulu.',
                ]);
            }
        }

        if ($res === 'material-receivings') {
            if ($obj->storing()->exists() || $obj->inspections()->exists()) {
                throw ValidationException::withMessages([
                    'receiving' => 'Receiving sudah punya inspeksi/stok; tidak bisa dihapus.',
                ]);
            }
        }

        if ($res === 'material-storings') {
            if ($obj->receiving_id || $obj->issuings()->exists()) {
                throw ValidationException::withMessages([
                    'stock' => 'Stok sudah punya riwayat transaksi; tidak bisa dihapus.',
                ]);
            }

            $obj->movements()->delete();
        }

        $obj->delete();

        return response()->json(['message' => 'OK']);
    }

    private function validateJointStatusTransition(Joint $joint, string $nextStatus, $user): void
    {
        $current = strtoupper((string) ($joint->status ?: 'PLANNED'));
        $next = strtoupper($nextStatus);
        if ($current === $next) {
            return;
        }

        $constructionStatuses = ['PLANNED', 'RECEIVED', 'ISSUED', 'FITUP_OK', 'WELDED', 'TESTED'];
        $qaqcStatuses = ['VISUAL_OK', 'NDT_OK', 'REPAIR'];
        $allStatuses = array_merge($constructionStatuses, $qaqcStatuses);
        if (! in_array($next, $allStatuses, true)) {
            throw ValidationException::withMessages(['status' => 'Status joint tidak dikenal.']);
        }

        if (in_array($next, ['VISUAL_OK', 'NDT_OK'], true) && ! $user->hasPermission('inspection.write')) {
            throw ValidationException::withMessages(['status' => 'Status Visual/NDT hanya boleh diubah lewat Inspection.']);
        }
        if ($next === 'REPAIR' && ! $user->hasPermission('joint.write')) {
            throw ValidationException::withMessages(['status' => 'Status REPAIR hanya boleh diubah oleh Construction.']);
        }
        if ($next === 'TESTED' && ! $user->hasPermission('testpackage.write')) {
            throw ValidationException::withMessages(['status' => 'Status TESTED hanya boleh diubah oleh Test Package.']);
        }

        $allowed = [
            'PLANNED' => ['RECEIVED'],
            'RECEIVED' => ['ISSUED'],
            'ISSUED' => ['FITUP_OK'],
            'FITUP_OK' => ['WELDED'],
            'WELDED' => ['TESTED'],
            'VISUAL_OK' => ['NDT_OK', 'REPAIR'],
            'NDT_OK' => ['TESTED', 'REPAIR'],
            'REPAIR' => ['WELDED', 'VISUAL_OK', 'NDT_OK'],
            'TESTED' => [],
        ];
        if (! in_array($next, $allowed[$current] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => "Transisi status {$current} ke {$next} tidak valid.",
            ]);
        }
    }

    private function syncWeldingMapToJoint(WeldingMap $map): void
    {
        $jointSeq = null;
        if (preg_match('/(\d+)/', (string) $map->joint_no, $m)) {
            $jointSeq = (int) $m[1];
        }

        $consDeptId = Department::where('code', 'CONS')->value('id') ?? $map->department_id;

        Joint::updateOrCreate(
            [
                'drawing_no' => $map->iso_drawing_no,
                'spool_no' => $map->spool_no,
                'seq' => $jointSeq,
            ],
            [
                'line_no' => $map->line_no,
                'item_a' => $map->mat_a_item,
                'spec_a' => $map->mat_a_spec,
                'item_b' => $map->mat_b_item,
                'spec_b' => $map->mat_b_spec,
                'size_in' => $map->dia_inch,
                'shop_field' => $map->location ?: 'Shop',
                'joint_type' => $map->joint_type ?: 'BW',
                'method' => 'GTAW+SMAW',
                'wps' => $map->wps_no,
                'status' => $map->status ?: 'PLANNED',
                'department_id' => $consDeptId,
            ]
        );
    }

    public function requestMaterialInspection(Request $request, int $id): JsonResponse
    {
        $this->checkWrite($request, 'material-receivings', 'update');

        $receiving = $this->scope($request, MaterialReceiving::query(), 'material-receivings')
            ->findOrFail($id);

        return response()->json(
            $this->materialFlow->requestInspection($receiving, $request->user())
        );
    }

    public function transferMaterialStock(Request $request, int $id): JsonResponse
    {
        $this->checkWrite($request, 'material-storings', 'update');

        $stock = $this->scope($request, MaterialStoring::query(), 'material-storings')
            ->findOrFail($id);

        $data = $request->validate([
            'storage_type' => ['required', 'in:WAREHOUSE,OPEN_YARD'],
            'location_detail' => ['required', 'string', 'max:128'],
            'notes' => ['nullable', 'string'],
        ]);

        $stock = $this->materialFlow->transferStock(
            $stock,
            $data['storage_type'],
            $data['location_detail'],
            $request->user(),
            $data['notes'] ?? null
        );

        return response()->json($stock);
    }

    public function materialRequirements(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('stock.view'),
            403,
            'Akses ditolak: butuh izin stock.view'
        );

        $filters = $request->validate([
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'drawing_id' => ['nullable', 'integer', 'exists:drawings,id'],
            'spool_no' => ['nullable', 'string', 'max:64'],
            'status' => ['nullable', 'in:ALL,SHORTAGE,FULFILLED'],
            'search' => ['nullable', 'string', 'max:128'],
        ]);

        return response()->json($this->materialRequirements->summarize(
            BillOfMaterial::query(),
            $this->scope($request, MaterialIssuing::query(), 'material-issuings'),
            $this->scope($request, MaterialStoring::query(), 'material-storings'),
            $this->scope($request, MaterialReceiving::query(), 'material-receivings'),
            $filters
        ));
    }

    private function isDepartmentScoped(string $res): bool
    {
        return in_array($res, $this->departmentScoped, true);
    }

    // Ringkasan angka untuk Overview. Angka mengikuti departemen user, kecuali Superadmin & Project Manager.
    public function overview(Request $request)
    {
        // Global dashboard menampilkan ringkasan lintas departemen untuk superadmin dan project manager.
        $canViewAll = $request->user()->isSuperAdmin() || $request->user()->role === 'project_manager';

        $joints = $canViewAll ? Joint::query() : $this->scope($request, Joint::query(), 'joints');
        $inspections = $canViewAll ? Inspection::query() : $this->scope($request, Inspection::query(), 'inspections');
        $stock = $canViewAll ? StockMove::query() : $this->scope($request, StockMove::query(), 'stock');
        $testPackages = $canViewAll ? TestPackage::query() : $this->scope($request, TestPackage::query(), 'test-packages');
        $hse = $canViewAll ? HseLog::query() : $this->scope($request, HseLog::query(), 'hse');
        $scopes = $canViewAll ? Scope::query() : $this->scope($request, Scope::query(), 'scopes');
        $daily = $canViewAll ? DailyProgress::query() : $this->scope($request, DailyProgress::query(), 'daily-progress');

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

    public function lookupFitting(Request $request)
    {
        $type = $request->query('component_type') ?? $request->query('fitting_type');
        $size = $request->query('size');
        $sch = $request->query('rating_sch') ?? $request->query('schedule');
        $secSize = $request->query('secondary_size');
        $spec = $request->query('material_spec');

        $fitting = FittingStandard::lookup($type, $size, $sch, $secSize);

        if (! $fitting) {
            return response()->json(['found' => false, 'data' => null]);
        }

        $isSs = FittingStandard::isStainless($spec, $request->query('description'));
        $unitWeight = $isSs ? ($fitting->weight_ss_kg ?: $fitting->weight_cs_kg) : ($fitting->weight_cs_kg ?: $fitting->weight_ss_kg);

        return response()->json([
            'found' => true,
            'data' => $fitting,
            'od_mm' => (float) $fitting->od_main_mm,
            'wall_mm' => (float) $fitting->wall_mm,
            'unit_weight_kg' => (float) $unitWeight,
            'is_stainless' => $isSs,
        ]);
    }

    public function toggleMilestoneActivity(Request $request, int $id): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('milestone.write'),
            403,
            'Akses ditolak: butuh izin milestone.write'
        );

        $activity = MilestoneActivity::with('milestone')->findOrFail($id);
        $milestone = $activity->milestone;
        $user = $request->user();
        $isManager = $user->isSuperAdmin() || $user->role === 'project_manager';

        if (! $isManager && (int) $milestone->user_id !== (int) $user->id) {
            abort(403, 'Akses ditolak: aktivitas milestone milik akun lain.');
        }

        $activity->is_done = $request->has('is_done')
            ? $request->boolean('is_done')
            : ! $activity->is_done;
        $activity->save();

        // Update status milestone otomatis berdasarkan checklist aktivitas
        $allActivities = $milestone->activities()->get();
        if ($allActivities->isNotEmpty()) {
            $doneCount = $allActivities->where('is_done', true)->count();
            if ($doneCount === $allActivities->count()) {
                $milestone->update([
                    'status' => 'COMPLETED',
                    'actual_date' => $milestone->actual_date ?: now()->toDateString(),
                ]);
            } elseif ($doneCount > 0 && $milestone->status === 'PENDING') {
                $milestone->update(['status' => 'IN_PROGRESS']);
            }
        }

        return response()->json($milestone->fresh()->load(['user:id,name,email,role', 'project:id,job_no,name,client', 'activities']));
    }

    public function noteMilestoneActivity(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $isManager = $user->isSuperAdmin() || $user->role === 'project_manager' || $user->hasPermission('scope.write');

        abort_unless(
            $isManager,
            403,
            'Akses ditolak: hanya Project Manager atau Super Admin yang dapat memberi catatan/teguran.'
        );

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $activity = MilestoneActivity::with('milestone')->findOrFail($id);
        $noteText = trim((string) ($validated['notes'] ?? ''));
        $activity->notes = $noteText !== '' ? $noteText : null;
        $activity->save();

        return response()->json(
            $activity->milestone->fresh()->load(['user:id,name,email,role', 'project:id,job_no,name,client', 'activities'])
        );
    }

    private function syncMilestoneActivities(ProjectMilestone $milestone, array $activities): void
    {
        $milestone->activities()->delete();

        $startDate = $milestone->start_date ? Carbon::parse($milestone->start_date) : null;
        foreach ($activities as $row) {
            $activityText = trim((string) ($row['activity'] ?? ''));
            $timeStart = trim((string) ($row['time_start'] ?? '08:00'));
            $timeEnd = trim((string) ($row['time_end'] ?? '17:00'));
            if ($activityText === '') {
                continue;
            }
            $dayNo = max(1, (int) ($row['day_number'] ?? 1));
            $workDate = ! empty($row['work_date'])
                ? $row['work_date']
                : ($startDate ? $startDate->copy()->addDays($dayNo - 1)->toDateString() : null);

            $milestone->activities()->create([
                'day_number' => $dayNo,
                'work_date' => $workDate,
                'time_start' => substr($timeStart, 0, 8),
                'time_end' => substr($timeEnd, 0, 8),
                'activity' => substr($activityText, 0, 255),
                'target_output' => isset($row['target_output']) ? substr((string) $row['target_output'], 0, 120) : null,
                'is_done' => (bool) ($row['is_done'] ?? false),
                'notes' => $row['notes'] ?? null,
            ]);
        }
    }
}
