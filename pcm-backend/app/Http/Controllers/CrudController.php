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
use App\Models\HseHazard;
use App\Models\HseLog;
use App\Models\HseManhour;
use App\Models\HsePermit;
use App\Models\HseTbm;
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
use App\Models\User;
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

    /**
     * Alur status paket uji. Panah hanya boleh maju satu tahap, kecuali
     * kembali ke DRAFT (sebelum uji) dan FAILED -> READY_FOR_TEST (retest).
     */
    private const TEST_PACKAGE_FLOW = [
        'DRAFT' => ['READY_FOR_TEST'],
        'READY_FOR_TEST' => ['TEST_IN_PROGRESS', 'DRAFT'],
        'TEST_IN_PROGRESS' => ['PASSED', 'FAILED'],
        'PASSED' => ['REINSTATED'],
        'FAILED' => ['READY_FOR_TEST'],
        'REINSTATED' => ['CLOSED'],
        'CLOSED' => [],
    ];

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
        'hse-permits' => [HsePermit::class, [
            'create' => 'hse.write',
            'update' => 'hse.write',
            'delete' => 'hse.write',
        ]],
        // Hazard boleh dilaporkan siapa saja yang punya akun, bukan hanya HSE.
        'hse-hazards' => [HseHazard::class, [
            'create' => 'hse.hazard.report',
            'update' => 'hse.write',
            'delete' => 'hse.write',
        ]],
        'hse-tbm' => [HseTbm::class, [
            'create' => 'hse.write',
            'update' => 'hse.write',
            'delete' => 'hse.write',
        ]],
        'hse-manhours' => [HseManhour::class, [
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
        'hse', 'hse-permits', 'hse-hazards', 'hse-tbm', 'hse-manhours',
        'scopes', 'progress', 'daily-progress',
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
        // Inspeksi QC menempel pada joint Construction; QA/QC dan Test Package
        // harus bisa membacanya lintas departemen untuk menilai kesiapan uji.
        'inspections' => 'inspection.view',
        // Material Control perlu membaca master Engineering (drawing, katalog
        // standar, BOM) untuk mencocokkan requirement dengan stok. Hak tulis
        // tetap dijaga permission drawing.write di checkWrite().
        'drawings' => ['stock.view', 'inspection.view', 'joint.view'],
        'welding-maps' => ['stock.view', 'inspection.view', 'joint.view'],
        'material-standards' => 'stock.view',
        'bill-of-materials' => 'stock.view',
        'material-receivings' => 'material_inspection.write',
        'material-inspections' => 'material_inspection.write',
        // Hazard adalah register lintas departemen: temuan yang dilaporkan
        // Construction harus terlihat oleh HSE dan sebaliknya. Hak tulis tetap
        // dijaga per baris di updateHseHazard().
        'hse-hazards' => ['hse.view', 'hse.hazard.report'],
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
        'hse-permits' => 'HSE',
        'hse-hazards' => 'HSE',
        'hse-tbm' => 'HSE',
        'hse-manhours' => 'HSE',
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
        $user = $request->user();

        if ($res === 'hse-hazards') {
            abort_unless(
                $user && ($user->hasPermission('hse.view') || $user->hasPermission('hse.hazard.report')),
                403,
                'Akses ditolak: butuh izin hse.view atau hse.hazard.report'
            );

            return;
        }

        $permission = match ($res) {
            'material-inspections' => 'material_inspection.view',
            'material-receivings', 'material-storings', 'material-issuings' => 'stock.view',
            'hse', 'hse-permits', 'hse-tbm', 'hse-manhours' => 'hse.view',
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
            if ($request->filled('project_id')) {
                // Joint tidak menyimpan project_id; kepemilikan project turun
                // dari isometric (drawing_no) yang menaunginya.
                $q->whereIn(
                    'drawing_no',
                    Drawing::query()->where('project_id', $request->project_id)->pluck('drawing_no')
                );
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
        } elseif ($res === 'test-packages') {
            // Paket selalu membawa joint anggotanya supaya layar bisa
            // menghitung kesiapan tanpa menebak dari seluruh joint project.
            $q->with([
                'project:id,job_no,name,client',
                'joints:id,drawing_no,line_no,spool_no,seq,size_in,status',
            ]);
            if ($request->filled('status')) {
                $q->where('status', $request->status);
            }
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('pkg_no', 'like', "%{$s}%")
                        ->orWhere('system_name', 'like', "%{$s}%")
                        ->orWhere('line_no', 'like', "%{$s}%");
                });
            }
        } elseif ($res === 'hse-hazards') {
            if ($request->filled('status')) {
                $q->where('status', $request->status);
            }
            if ($request->filled('category')) {
                $q->where('category', $request->category);
            }
            if ($request->filled('severity')) {
                $q->where('severity', $request->severity);
            }
            if ($request->boolean('overdue')) {
                $q->where('status', '!=', 'CLOSED')
                    ->whereNotNull('due_date')
                    ->whereDate('due_date', '<', now()->toDateString());
            }
            if ($request->boolean('mine')) {
                $q->where('pic_user_id', $request->user()->id);
            }
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('hazard_no', 'like', "%{$s}%")
                        ->orWhere('location', 'like', "%{$s}%")
                        ->orWhere('description', 'like', "%{$s}%")
                        ->orWhere('pic_name', 'like', "%{$s}%");
                });
            }
        } elseif ($res === 'hse-permits') {
            if ($request->filled('status')) {
                $q->where('status', $request->status);
            }
            if ($request->filled('permit_type')) {
                $q->where('permit_type', $request->permit_type);
            }
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('permit_no', 'like', "%{$s}%")
                        ->orWhere('work_location', 'like', "%{$s}%")
                        ->orWhere('applicant_name', 'like', "%{$s}%")
                        ->orWhere('work_scope', 'like', "%{$s}%");
                });
            }
        } elseif ($res === 'hse-tbm') {
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('topic', 'like', "%{$s}%")
                        ->orWhere('location', 'like', "%{$s}%")
                        ->orWhere('leader_name', 'like', "%{$s}%");
                });
            }
        } elseif ($res === 'hse-manhours') {
            if ($request->filled('search')) {
                $s = $request->search;
                $q->where(function ($query) use ($s) {
                    $query->where('area', 'like', "%{$s}%")
                        ->orWhere('contractor', 'like', "%{$s}%");
                });
            }
        } elseif ($request->filled('search')) {
            $s = $request->search;
            $col = $res === 'stock' ? 'description' : 'id';
            $q->where($col, 'like', "%{$s}%");
        }

        if ($request->filled('project_id') && Schema::hasColumn($q->getModel()->getTable(), 'project_id')) {
            $q->where($q->getModel()->getTable().'.project_id', $request->project_id);
        }

        $rows = $q->orderByDesc('id')->get();

        // Identitas pelapor hazard anonim hanya boleh dibaca HSE. Role lain
        // tetap melihat temuannya supaya bisa menindaklanjuti.
        if ($res === 'hse-hazards') {
            $canSeeIdentity = $request->user()
                && ($request->user()->hasPermission('hse.view') || $request->user()->hasPermission('hse.write'));

            $rows->each(function (HseHazard $hazard) use ($canSeeIdentity) {
                if ($hazard->is_anonymous && ! $canSeeIdentity) {
                    $hazard->reporter_name = 'Anonim';
                    $hazard->reporter_company = null;
                    $hazard->reported_by = null;
                    $hazard->reporter_department_id = null;
                }
            });
        }

        // app.jsx memanggil api.get('/x') lalu memakai hasilnya sebagai array langsung.
        return response()->json($rows);
    }

    public function show(Request $request, string $res, int $id)
    {
        $this->checkRead($request, $res);
        [$model] = $this->resolve($res);
        $with = match ($res) {
            'joints' => ['inspections'],
            'test-packages' => ['project:id,job_no,name,client', 'joints'],
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

        $hseResources = ['hse', 'hse-permits', 'hse-hazards', 'hse-tbm', 'hse-manhours'];

        if (in_array($res, $hseResources, true)) {
            // Validasi minimum: kolom NOT NULL tidak boleh mengandalkan form
            // frontend saja, karena API ini juga dipakai klien lain.
            $hseRules = [
                'hse' => [
                    'log_date' => ['required', 'date'],
                    'kind' => ['required', 'string', 'max:32'],
                    'description' => ['required', 'string'],
                ],
                'hse-permits' => [
                    'permit_type' => ['required', 'string', 'max:64'],
                    'work_location' => ['required', 'string', 'max:255'],
                    'work_scope' => ['required', 'string'],
                    'applicant_name' => ['required', 'string', 'max:255'],
                    'valid_from' => ['required', 'date'],
                    'valid_to' => ['required', 'date', 'after:valid_from'],
                ],
                'hse-hazards' => [
                    'location' => ['required', 'string', 'max:255'],
                    'description' => ['required', 'string'],
                    'found_date' => ['nullable', 'date'],
                    'severity' => ['nullable', 'string', 'max:32'],
                    'category' => ['nullable', 'string', 'max:32'],
                ],
                'hse-tbm' => [
                    'tbm_date' => ['required', 'date'],
                    'topic' => ['required', 'string'],
                    'shift' => ['nullable', 'string', 'max:16'],
                ],
                'hse-manhours' => [
                    'work_date' => ['required', 'date'],
                    'worker_count' => ['required', 'numeric', 'min:0'],
                    'work_hours' => ['required', 'numeric', 'min:0'],
                ],
            ];

            if (isset($hseRules[$res])) {
                $request->validate($hseRules[$res]);
            }

            if (empty($data['project_id'])) {
                throw ValidationException::withMessages([
                    'project_id' => 'Project wajib dipilih untuk data HSE.',
                ]);
            }

            $project = Project::query()->find($data['project_id']);
            if (! $project) {
                throw ValidationException::withMessages([
                    'project_id' => 'Project tidak ditemukan.',
                ]);
            }

            $jobNo = $project->job_no ?: 'PROJECT';

            if ($res === 'hse' && empty($data['log_no'])) {
                $data['log_no'] = $this->nextHseNumber(HseLog::class, 'log_no', "HSE-{$jobNo}-");
            }

            if ($res === 'hse-permits' && empty($data['permit_no'])) {
                $data['permit_no'] = $this->nextHseNumber(HsePermit::class, 'permit_no', "PTW-{$jobNo}-");
            }

            if ($res === 'hse-permits' && empty($data['status'])) {
                // Default kolom DB tidak ikut terkirim pada response create,
                // jadi status diisi eksplisit agar UI langsung tahu PENDING.
                $data['status'] = 'PENDING';
            }

            if ($res === 'hse-manhours') {
                // Angka man-hours selalu dihitung server; klien tidak boleh
                // mengirim total yang berbeda dari pekerja x jam.
                $this->assertManhourSane($data, (int) $data['project_id']);
                $data['manhours'] = round(
                    (float) ($data['worker_count'] ?? 0) * (float) ($data['work_hours'] ?? 0),
                    2
                );
            }

            if ($res === 'hse-tbm' && is_string($data['attendee_list'] ?? null)) {
                $decoded = json_decode($data['attendee_list'], true);
                $data['attendee_list'] = is_array($decoded) ? $decoded : null;
            }

            if ($res === 'hse-tbm'
                && empty($data['attendees_count'])
                && is_array($data['attendee_list'] ?? null)) {
                $data['attendees_count'] = count($data['attendee_list']);
            }

            $data['created_by'] = $request->user()->id;
        }

        if ($res === 'hse' || $res === 'hse-tbm') {
            $data = $this->storeHseUpload($request, $data, 'photo_file', 'photo_path');
        }

        if ($res === 'hse-permits') {
            $data = $this->storeHseUpload($request, $data, 'attachment_file', 'attachment_path');
        }

        if ($res === 'hse-hazards') {
            $user = $request->user();

            // department_id adalah pemilik modul (HSE), bukan departemen
            // pelapor. Kalau tertukar, temuan Construction akan hilang dari
            // layar HSE karena filter departemen.
            $data['department_id'] = Department::query()->where('code', 'HSE')->value('id');
            $data['reported_by'] = $user->id;
            $data['reporter_name'] = $data['reporter_name'] ?? $user->name;
            $data['reporter_department_id'] = $data['reporter_department_id'] ?? $user->department_id;
            $data['status'] = 'OPEN';
            $data['found_date'] = $data['found_date'] ?? now()->toDateString();

            if (empty($data['hazard_no'])) {
                $jobNo = Project::query()->whereKey($data['project_id'])->value('job_no') ?: 'PROJECT';
                $data['hazard_no'] = $this->nextHseNumber(HseHazard::class, 'hazard_no', "HZD-{$jobNo}-");
            }

            if (array_key_exists('pic_user_id', $data) && ($data['pic_user_id'] === '' || $data['pic_user_id'] === null)) {
                // PIC eksternal (nama + perusahaan) tidak punya user_id.
                $data['pic_user_id'] = null;
                $data['pic_department_id'] = null;
            } elseif (! empty($data['pic_user_id'])) {
                $pic = User::query()->find($data['pic_user_id']);
                if (! $pic) {
                    throw ValidationException::withMessages([
                        'pic_user_id' => 'PIC tidak ditemukan.',
                    ]);
                }
                $data['pic_department_id'] = $pic->department_id;
                $data['pic_name'] = $data['pic_name'] ?? $pic->name;
            }

            unset($data['verified_by'], $data['verified_at'], $data['verification_note']);

            $data = $this->storeHseUpload($request, $data, 'photo_before_file', 'photo_before');
            $data = $this->storeHseUpload($request, $data, 'photo_after_file', 'photo_after');
        }

        if ($res === 'test-packages') {
            [$data, $testPackageJoints] = $this->prepareTestPackage($request, $data);

            // Status READY_FOR_TEST hanya boleh lahir dari paket yang benar-benar
            // siap. DRAFT tidak diuji gate karena paket masih boleh disusun.
            if ($data['status'] !== 'DRAFT') {
                $this->assertTestPackageReady($data, $testPackageJoints ?? []);
            }

            $obj = DB::transaction(function () use ($model, $data, $testPackageJoints) {
                $pkg = $model::create($data);
                $pkg->joints()->sync($testPackageJoints ?? []);

                return $pkg->fresh()->load([
                    'project:id,job_no,name,client',
                    'joints:id,drawing_no,line_no,spool_no,seq,size_in,status',
                ]);
            });

            return response()->json($obj, 201);
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
        // Hazard punya aturan tulis per baris (PIC hanya baris yang ditugaskan),
        // jadi tidak bisa memakai checkWrite() generik.
        if ($res === 'hse-hazards') {
            return $this->updateHseHazard($request, $id);
        }

        $this->checkWrite($request, $res, 'update');
        [$model] = $this->resolve($res);

        $obj = $this->scope($request, $model::query(), $res)->findOrFail($id);

        $data = $request->all();

        if ($res === 'test-packages') {
            return $this->updateTestPackage($request, $obj, $data);
        }

        if ($res === 'hse-permits' && array_key_exists('status', $data)) {
            if (in_array($data['status'], ['APPROVED', 'REJECTED'], true)
                && ! $request->user()->hasPermission('hse.approve')) {
                abort(403, 'Akses ditolak: butuh izin hse.approve untuk menyetujui permit.');
            }

            if ($data['status'] === 'APPROVED') {
                $data['approved_by'] = $request->user()->id;
                $data['approved_at'] = now();
                $data['rejection_reason'] = null;
            }

            if ($data['status'] === 'REJECTED') {
                $data['approved_by'] = null;
                $data['approved_at'] = null;
            }
        }

        if ($res === 'hse-manhours') {
            $merged = [
                'worker_count' => array_key_exists('worker_count', $data) ? $data['worker_count'] : $obj->worker_count,
                'work_hours' => array_key_exists('work_hours', $data) ? $data['work_hours'] : $obj->work_hours,
                'work_date' => array_key_exists('work_date', $data)
                    ? $data['work_date']
                    : optional($obj->work_date)->toDateString(),
                'area' => array_key_exists('area', $data) ? $data['area'] : $obj->area,
                'contractor' => array_key_exists('contractor', $data) ? $data['contractor'] : $obj->contractor,
            ];

            $this->assertManhourSane($merged, (int) $obj->project_id, (int) $obj->id);

            if (array_key_exists('worker_count', $data) || array_key_exists('work_hours', $data)) {
                $data['manhours'] = round(
                    (float) $merged['worker_count'] * (float) $merged['work_hours'],
                    2
                );
            }
        }

        if ($res === 'hse' || $res === 'hse-tbm') {
            if ($res === 'hse-tbm' && is_string($data['attendee_list'] ?? null)) {
                $decoded = json_decode($data['attendee_list'], true);
                $data['attendee_list'] = is_array($decoded) ? $decoded : null;
            }
            $data = $this->storeHseUpload($request, $data, 'photo_file', 'photo_path');
        }

        if ($res === 'hse-permits') {
            $data = $this->storeHseUpload($request, $data, 'attachment_file', 'attachment_path');
        }
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

    /**
     * Hazard ditulis oleh dua pihak dengan hak berbeda:
     * - PIC (user yang ditugaskan) hanya boleh mengisi corrective action,
     *   foto after, dan status IN_PROGRESS/RESOLVED pada barisnya sendiri.
     * - HSE (hse.write / hse.approve) boleh mengubah seluruh baris, menutup
     *   (CLOSED) setelah verifikasi, atau membuka kembali (REOPENED).
     */
    private function updateHseHazard(Request $request, int $id)
    {
        $user = $request->user();
        $hazard = $this->scope($request, HseHazard::query(), 'hse-hazards')->findOrFail($id);

        $isHse = $user->hasPermission('hse.write') || $user->hasPermission('hse.approve');
        $isPic = $hazard->pic_user_id !== null && (int) $hazard->pic_user_id === (int) $user->id;

        abort_unless(
            $isHse || $isPic,
            403,
            'Akses ditolak: hanya PIC yang ditugaskan atau HSE yang dapat mengubah temuan ini.'
        );

        $data = $request->all();

        unset(
            $data['project_id'], $data['hazard_no'], $data['reported_by'],
            $data['reporter_name'], $data['reporter_company'], $data['reporter_department_id'],
            $data['is_anonymous'], $data['department_id'], $data['found_date'],
            $data['verified_by'], $data['verified_at']
        );

        if (! $isHse) {
            // Identitas temuan tetap milik pelapor/HSE.
            $data = array_intersect_key($data, array_flip([
                'corrective_action', 'status', 'photo_after_file',
            ]));
        }

        $nextStatus = $data['status'] ?? null;

        if ($nextStatus !== null && ! $isHse && ! in_array($nextStatus, ['IN_PROGRESS', 'RESOLVED'], true)) {
            abort(403, 'PIC hanya dapat memulai atau menyelesaikan tindakan perbaikan.');
        }

        if ($nextStatus === 'RESOLVED') {
            $action = trim((string) ($data['corrective_action'] ?? $hazard->corrective_action));
            if ($action === '') {
                throw ValidationException::withMessages([
                    'corrective_action' => 'Isi tindakan perbaikan sebelum menandai temuan selesai.',
                ]);
            }
        }

        if ($isHse && $nextStatus === 'CLOSED') {
            $data['verified_by'] = $user->id;
            $data['verified_at'] = now();
        }

        if ($isHse && $nextStatus === 'REOPENED') {
            $data['verified_by'] = null;
            $data['verified_at'] = null;
        }

        if ($isHse && array_key_exists('pic_user_id', $data)) {
            if ($data['pic_user_id'] === '' || $data['pic_user_id'] === null) {
                // Form mengirim string kosong saat PIC eksternal dipilih.
                // Tanpa normalisasi ini kolom bigint menerima '' dan MySQL
                // strict mode menolak simpanan.
                $data['pic_user_id'] = null;
                $data['pic_department_id'] = null;
            } else {
                $pic = User::query()->find($data['pic_user_id']);
                if (! $pic) {
                    throw ValidationException::withMessages([
                        'pic_user_id' => 'PIC tidak ditemukan.',
                    ]);
                }
                $data['pic_department_id'] = $pic->department_id;
                if (empty($data['pic_name'])) {
                    $data['pic_name'] = $pic->name;
                }
            }
        }

        $data = $this->storeHseUpload($request, $data, 'photo_before_file', 'photo_before');
        $data = $this->storeHseUpload($request, $data, 'photo_after_file', 'photo_after');

        $hazard->update($data);

        return response()->json($hazard->fresh());
    }

    public function approveHsePermit(Request $request, int $id)
    {
        abort_unless(
            $request->user()->hasPermission('hse.approve'),
            403,
            'Akses ditolak: butuh izin hse.approve'
        );

        $permit = $this->scope($request, HsePermit::query(), 'hse-permits')->findOrFail($id);

        if ($permit->status === 'CLOSED') {
            throw ValidationException::withMessages([
                'status' => 'Permit yang sudah ditutup tidak bisa disetujui ulang.',
            ]);
        }

        $permit->update([
            'status' => 'APPROVED',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        return response()->json($permit->fresh());
    }

    public function rejectHsePermit(Request $request, int $id)
    {
        abort_unless(
            $request->user()->hasPermission('hse.approve'),
            403,
            'Akses ditolak: butuh izin hse.approve'
        );

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $permit = $this->scope($request, HsePermit::query(), 'hse-permits')->findOrFail($id);

        $permit->update([
            'status' => 'REJECTED',
            'approved_by' => null,
            'approved_at' => null,
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return response()->json($permit->fresh());
    }

    /**
     * Pilihan PIC untuk form hazard. Daftar user lengkap ada di area admin,
     * yang tidak boleh dibuka HSE; endpoint ini hanya mengembalikan identitas
     * minimum yang dibutuhkan untuk menugaskan tindakan perbaikan.
     */
    public function hsePicOptions(Request $request)
    {
        abort_unless(
            $request->user()->hasPermission('hse.write')
                || $request->user()->hasPermission('hse.approve'),
            403,
            'Akses ditolak: butuh izin hse.write atau hse.approve'
        );

        return response()->json(
            User::query()
                ->where('is_active', true)
                ->with('department:id,code,name')
                ->orderBy('name')
                ->get(['id', 'name', 'role', 'department_id'])
        );
    }

    /**
     * KPI HSE dihitung dari baris database, bukan konstanta. Angka nol berarti
     * memang belum ada data, bukan "zero accident" karangan.
     */
    public function hseSummary(Request $request)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->hasPermission('hse.view') || $user->hasPermission('hse.hazard.report')),
            403,
            'Akses ditolak: butuh izin hse.view atau hse.hazard.report'
        );

        $projectId = $request->filled('project_id') ? (int) $request->project_id : null;
        $withProject = function ($query) use ($projectId) {
            return $projectId
                ? $query->where($query->getModel()->getTable().'.project_id', $projectId)
                : $query;
        };

        $openStatuses = ['OPEN', 'IN_PROGRESS', 'REOPENED'];
        $today = now()->toDateString();

        $hazards = $withProject($this->scope($request, HseHazard::query(), 'hse-hazards'));
        $permits = $withProject($this->scope($request, HsePermit::query(), 'hse-permits'));
        $tbm = $withProject($this->scope($request, HseTbm::query(), 'hse-tbm'));
        $manhours = $withProject($this->scope($request, HseManhour::query(), 'hse-manhours'));

        return response()->json([
            'project_id' => $projectId,
            'generated_at' => now()->toIso8601String(),
            'hazards' => [
                'total' => (clone $hazards)->count(),
                'open' => (clone $hazards)->whereIn('status', $openStatuses)->count(),
                'overdue' => (clone $hazards)
                    ->whereIn('status', $openStatuses)
                    ->whereNotNull('due_date')
                    ->whereDate('due_date', '<', $today)
                    ->count(),
                'closed' => (clone $hazards)->where('status', 'CLOSED')->count(),
                'reported_this_month' => (clone $hazards)
                    ->whereYear('found_date', now()->year)
                    ->whereMonth('found_date', now()->month)
                    ->count(),
            ],
            'permits' => [
                'total' => (clone $permits)->count(),
                'pending' => (clone $permits)->where('status', 'PENDING')->count(),
                'active' => (clone $permits)
                    ->where('status', 'APPROVED')
                    ->where(function ($query) {
                        $query->whereNull('valid_to')->orWhere('valid_to', '>=', now());
                    })
                    ->count(),
                'expired' => (clone $permits)
                    ->where('status', 'APPROVED')
                    ->whereNotNull('valid_to')
                    ->where('valid_to', '<', now())
                    ->count(),
            ],
            'tbm' => [
                'total' => (clone $tbm)->count(),
                'this_month' => (clone $tbm)
                    ->whereYear('tbm_date', now()->year)
                    ->whereMonth('tbm_date', now()->month)
                    ->count(),
                'last_date' => (clone $tbm)->max('tbm_date'),
                'attendees_total' => (int) (clone $tbm)->sum('attendees_count'),
            ],
            'manhours' => [
                'total' => round((float) (clone $manhours)->sum('manhours'), 2),
                'this_month' => round((float) (clone $manhours)
                    ->whereYear('work_date', now()->year)
                    ->whereMonth('work_date', now()->month)
                    ->sum('manhours'), 2),
                'days_recorded' => (clone $manhours)->distinct()->count('work_date'),
            ],
        ]);
    }

    private function nextHseNumber(string $modelClass, string $column, string $prefix): string
    {
        $sequence = $modelClass::query()->where($column, 'like', $prefix.'%')->count() + 1;

        do {
            $number = $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
            $exists = $modelClass::query()->where($column, $number)->exists();
            $sequence++;
        } while ($exists);

        return $number;
    }

    private function storeHseUpload(Request $request, array $data, string $fileField, string $column): array
    {
        unset($data[$fileField]);

        if ($request->hasFile($fileField)) {
            $data[$column] = '/storage/'.$request->file($fileField)->store('hse/'.now()->format('Y/m'), 'public');
        }

        return $data;
    }

    /**
     * Man-hours adalah angka KPI, jadi nilainya harus wajar dan tidak boleh
     * dobel. Tanpa penjagaan ini satu baris bisa dikirim berkali-kali dan
     * "safe man-hours" naik tanpa ada pekerjaan tambahan.
     */
    private function assertManhourSane(array $data, int $projectId, ?int $ignoreId = null): void
    {
        $workers = (int) ($data['worker_count'] ?? 0);
        $hours = (float) ($data['work_hours'] ?? 0);

        if ($workers < 1 || $workers > 5000) {
            throw ValidationException::withMessages([
                'worker_count' => 'Jumlah pekerja harus antara 1 dan 5.000 orang.',
            ]);
        }

        if ($hours <= 0 || $hours > 24) {
            throw ValidationException::withMessages([
                'work_hours' => 'Jam kerja per orang harus lebih dari 0 dan maksimal 24 jam per hari.',
            ]);
        }

        $date = substr((string) ($data['work_date'] ?? ''), 0, 10);
        if ($date === '') {
            throw ValidationException::withMessages([
                'work_date' => 'Tanggal kerja wajib diisi.',
            ]);
        }

        $area = trim((string) ($data['area'] ?? ''));
        $contractor = trim((string) ($data['contractor'] ?? ''));

        $duplicate = HseManhour::query()
            ->where('project_id', $projectId)
            ->whereDate('work_date', $date)
            ->whereRaw("TRIM(COALESCE(area, '')) = ?", [$area])
            ->whereRaw("TRIM(COALESCE(contractor, '')) = ?", [$contractor])
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->first();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'work_date' => "Sudah ada man-hours untuk tanggal, area, dan kontraktor yang sama (baris #{$duplicate->id}). "
                    .'Ubah baris itu, atau bedakan area/kontraktor bila memang pekerjaannya terpisah.',
            ]);
        }
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

        if ($res === 'test-packages') {
            // Paket yang sudah diuji adalah rekaman mutu; hanya paket yang
            // belum masuk tahap uji yang boleh dihapus.
            $status = $this->normaliseTestPackageStatus($obj->status);
            if (in_array($status, ['TEST_IN_PROGRESS', 'PASSED', 'FAILED', 'REINSTATED', 'CLOSED'], true)) {
                throw ValidationException::withMessages([
                    'test_package' => 'Paket yang sudah masuk tahap uji tidak bisa dihapus; tutup atau biarkan sebagai rekaman.',
                ]);
            }

            $obj->joints()->detach();
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

    /* ------------------------------------------------------------------
     * Test Package: cakupan joint, nomor otomatis, dan gate kesiapan uji
     * ------------------------------------------------------------------ */

    /**
     * Validasi & normalisasi payload paket uji.
     *
     * @return array{0: array, 1: array<int>|null} [data siap simpan, id joint]
     */
    private function prepareTestPackage(Request $request, array $data, ?TestPackage $existing = null): array
    {
        $request->validate([
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'pkg_no' => ['nullable', 'string', 'max:64'],
            'system_name' => ['sometimes', 'required', 'string', 'max:255'],
            'line_no' => ['nullable', 'string', 'max:255'],
            'test_kind' => ['nullable', 'string', 'max:32'],
            'test_pressure_bar' => ['nullable', 'numeric', 'min:0.1', 'max:2000'],
            'holding_time_min' => ['nullable', 'integer', 'min:1', 'max:1440'],
            'schedule_date' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'max:32'],
            'punch_list_open' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'blinds_installed' => ['nullable', 'boolean'],
            'reinstated' => ['nullable', 'boolean'],
            'blinds' => ['nullable', 'string'],
            'joint_ids' => ['nullable', 'array'],
            'joint_ids.*' => ['integer', 'exists:joints,id'],
        ]);

        $projectId = $data['project_id'] ?? $existing?->project_id;
        if (! $projectId) {
            throw ValidationException::withMessages([
                'project_id' => 'Project wajib dipilih untuk test package.',
            ]);
        }
        $data['project_id'] = (int) $projectId;

        $status = $this->normaliseTestPackageStatus($data['status'] ?? $existing?->status ?? 'DRAFT');
        if (! array_key_exists($status, self::TEST_PACKAGE_FLOW)) {
            throw ValidationException::withMessages([
                'status' => "Status test package '{$status}' tidak dikenal.",
            ]);
        }
        $data['status'] = $status;

        if (array_key_exists('test_kind', $data)) {
            $data['test_kind'] = $this->normaliseTestKind($data['test_kind']);
        }

        if (array_key_exists('punch_list_open', $data)) {
            $data['punch_list_open'] = max(0, (int) $data['punch_list_open']);
        }

        foreach (['blinds_installed', 'reinstated'] as $flag) {
            if (array_key_exists($flag, $data)) {
                $data[$flag] = filter_var($data[$flag], FILTER_VALIDATE_BOOLEAN);
            }
        }

        if (! $existing) {
            // Default eksplisit supaya gate kesiapan punya angka, bukan null.
            $data['punch_list_open'] = (int) ($data['punch_list_open'] ?? 0);
            $data['blinds_installed'] = filter_var($data['blinds_installed'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $data['reinstated'] = filter_var($data['reinstated'] ?? false, FILTER_VALIDATE_BOOLEAN);
        }

        if (blank($data['pkg_no'] ?? null)) {
            $data['pkg_no'] = $this->nextTestPackageNo((int) $data['project_id'], $existing?->id);
        }

        $jointIds = null;
        if (array_key_exists('joint_ids', $data)) {
            $jointIds = collect((array) $data['joint_ids'])
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values()
                ->all();
        }
        unset($data['joint_ids']);

        if ($jointIds !== null) {
            $this->assertJointsUsableForPackage($jointIds, (int) $data['project_id'], $existing?->id);
        }

        return [$data, $jointIds];
    }

    private function updateTestPackage(Request $request, TestPackage $pkg, array $data)
    {
        [$data, $jointIds] = $this->prepareTestPackage($request, $data, $pkg);

        // Departemen pemilik tidak boleh berpindah lewat form biasa.
        if (! $request->user()->isSuperAdmin()) {
            unset($data['department_id']);
        }

        $current = $this->normaliseTestPackageStatus($pkg->status);
        $next = $data['status'] ?? $current;

        if ($next !== $current) {
            $reinstated = array_key_exists('reinstated', $data) ? (bool) $data['reinstated'] : (bool) $pkg->reinstated;
            $this->assertTestPackageStatusChange($current, $next, $reinstated);
        }

        // Naik ke READY_FOR_TEST adalah permintaan eksplisit: kalau prasyarat
        // belum lengkap, tolak dengan alasan. Kalau paket sudah READY lalu
        // diedit sampai tidak lagi memenuhi syarat, turunkan sendiri ke DRAFT
        // supaya status tidak pernah berbohong.
        $requestedReady = $current !== 'READY_FOR_TEST' && $next === 'READY_FOR_TEST';

        if ($next === 'REINSTATED') {
            $data['reinstated'] = true;
        }

        $result = DB::transaction(function () use ($pkg, $data, $jointIds, $next, $requestedReady) {
            if ($jointIds !== null) {
                $pkg->joints()->sync($jointIds);
            }

            $pkg->update($data);

            // Gate memakai nilai final (setelah update): punch list dan blind
            // yang baru diubah pada request ini ikut dinilai. Uji juga tidak
            // boleh dimulai dari paket yang prasyaratnya belum lengkap.
            if ($next === 'READY_FOR_TEST' || $next === 'TEST_IN_PROGRESS') {
                try {
                    $this->assertTestPackageReady([
                        'punch_list_open' => $pkg->punch_list_open,
                        'blinds_installed' => $pkg->blinds_installed,
                    ], $pkg->joints()->pluck('joints.id')->all());
                } catch (ValidationException $exception) {
                    if ($requestedReady || $next === 'TEST_IN_PROGRESS') {
                        throw $exception;
                    }

                    $pkg->update(['status' => 'DRAFT']);
                }
            }

            return $pkg->fresh()->load([
                'project:id,job_no,name,client',
                'joints:id,drawing_no,line_no,spool_no,seq,size_in,status',
            ]);
        });

        return response()->json($result);
    }

    private function normaliseTestPackageStatus(?string $status): string
    {
        $value = strtoupper(trim((string) $status));

        return match ($value) {
            '', 'PLANNED', 'DRAFT' => 'DRAFT',
            'READY', 'READY_FOR_TEST', 'READY TO TEST' => 'READY_FOR_TEST',
            'IN_PROGRESS', 'TEST_IN_PROGRESS', 'TESTING' => 'TEST_IN_PROGRESS',
            'PASS', 'PASSED' => 'PASSED',
            'FAIL', 'FAILED' => 'FAILED',
            'REINSTATED' => 'REINSTATED',
            'CLOSED' => 'CLOSED',
            default => $value,
        };
    }

    private function normaliseTestKind(?string $kind): string
    {
        $value = trim((string) $kind);
        if ($value === '') {
            return 'Hydro';
        }

        $lower = strtolower($value);
        if (str_contains($lower, 'pneum')) {
            return 'Pneumatic';
        }
        if (str_contains($lower, 'hydro')) {
            return 'Hydro';
        }

        return $value;
    }

    private function nextTestPackageNo(int $projectId, ?int $ignoreId = null): string
    {
        $jobNo = Project::query()->whereKey($projectId)->value('job_no') ?: 'PROJECT';
        $prefix = "TP-{$jobNo}-";

        $max = 0;
        $used = TestPackage::query()
            ->where('pkg_no', 'like', $prefix.'%')
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->pluck('pkg_no');

        foreach ($used as $no) {
            if (preg_match('/^'.preg_quote($prefix, '/').'(\d+)$/', (string) $no, $m)) {
                $max = max($max, (int) $m[1]);
            }
        }

        do {
            $max++;
            $candidate = $prefix.str_pad((string) $max, 3, '0', STR_PAD_LEFT);
        } while (TestPackage::query()->where('pkg_no', $candidate)->exists());

        return $candidate;
    }

    /**
     * Joint hanya boleh dipakai satu paket aktif, dan harus berasal dari
     * project yang sama. Joint tanpa isometric terdaftar dibiarkan supaya
     * data lama tidak terkunci.
     */
    private function assertJointsUsableForPackage(array $jointIds, int $projectId, ?int $ignorePackageId = null): void
    {
        if ($jointIds === []) {
            return;
        }

        $joints = Joint::query()->whereIn('id', $jointIds)->get(['id', 'drawing_no', 'spool_no']);
        if ($joints->count() !== count($jointIds)) {
            throw ValidationException::withMessages([
                'joint_ids' => 'Ada joint yang tidak ditemukan.',
            ]);
        }

        $drawingProjects = Drawing::query()
            ->whereIn('drawing_no', $joints->pluck('drawing_no')->filter()->unique()->values())
            ->pluck('project_id', 'drawing_no');

        $foreign = $joints->filter(function ($joint) use ($drawingProjects, $projectId) {
            $owner = $drawingProjects[$joint->drawing_no] ?? null;

            return $owner !== null && (int) $owner !== $projectId;
        });

        if ($foreign->isNotEmpty()) {
            throw ValidationException::withMessages([
                'joint_ids' => 'Joint berikut berasal dari project lain: '
                    .$foreign->take(5)->map(fn ($j) => $j->spool_no ?: '#'.$j->id)->implode(', '),
            ]);
        }

        $conflictPackages = DB::table('joint_test_package as jtp')
            ->join('test_packages as tp', 'tp.id', '=', 'jtp.test_package_id')
            ->whereIn('jtp.joint_id', $jointIds)
            ->where('tp.status', '!=', 'CLOSED')
            ->when($ignorePackageId, fn ($query) => $query->where('tp.id', '!=', $ignorePackageId))
            ->pluck('tp.pkg_no')
            ->unique()
            ->values();

        if ($conflictPackages->isNotEmpty()) {
            throw ValidationException::withMessages([
                'joint_ids' => 'Joint ini sudah masuk paket lain yang belum ditutup: '
                    .$conflictPackages->implode(', ').'.',
            ]);
        }
    }

    private function assertTestPackageStatusChange(string $from, string $to, bool $reinstated): void
    {
        $allowed = self::TEST_PACKAGE_FLOW[$from] ?? [];

        if (! in_array($to, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => "Status {$from} tidak bisa langsung menjadi {$to}.",
            ]);
        }

        if ($to === 'CLOSED' && ! $reinstated) {
            throw ValidationException::withMessages([
                'status' => 'Paket hanya bisa ditutup setelah blind dilepas dan sistem di-reinstate.',
            ]);
        }
    }

    /**
     * Gate uji tekan: tidak ada satu pun joint yang boleh masuk READY_FOR_TEST
     * sebelum NDT bersih, punch list nol, dan blind terpasang.
     *
     * @param  array<int>  $jointIds
     */
    private function assertTestPackageReady(array $data, array $jointIds): void
    {
        if ($jointIds === []) {
            throw ValidationException::withMessages([
                'joint_ids' => 'Paket belum berisi joint. Pilih joint yang akan diuji sebelum menandai siap uji.',
            ]);
        }

        $joints = Joint::query()
            ->whereIn('id', $jointIds)
            ->get(['id', 'status', 'spool_no']);

        $notReady = $joints->reject(fn ($joint) => in_array($joint->status, ['NDT_OK', 'TESTED'], true));

        if ($notReady->isNotEmpty()) {
            $labels = $notReady->take(5)->map(fn ($j) => $j->spool_no ?: '#'.$j->id)->implode(', ');

            throw ValidationException::withMessages([
                'status' => sprintf(
                    '%d dari %d joint belum lolos NDT (%s). Selesaikan inspeksi QC dulu.',
                    $notReady->count(),
                    $joints->count(),
                    $labels
                ),
            ]);
        }

        $punch = (int) ($data['punch_list_open'] ?? 0);
        if ($punch > 0) {
            throw ValidationException::withMessages([
                'status' => "Masih ada {$punch} punch list terbuka. Tutup dulu sebelum uji tekan.",
            ]);
        }

        if (! ($data['blinds_installed'] ?? false)) {
            throw ValidationException::withMessages([
                'status' => 'Blind/test blind belum ditandai terpasang. Pasang dulu sebelum uji tekan.',
            ]);
        }
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
