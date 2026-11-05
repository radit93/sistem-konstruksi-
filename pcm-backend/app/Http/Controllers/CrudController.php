<?php

namespace App\Http\Controllers;

use App\Models\BillOfMaterial;
use App\Models\BudgetItem;
use App\Models\DailyProgress;
use App\Models\Department;
use App\Models\DocumentControl;
use App\Models\Drawing;
use App\Models\EngineeringBoq;
use App\Models\HseLog;
use App\Models\Inspection;
use App\Models\Joint;
use App\Models\LineService;
use App\Models\MaterialInspection;
use App\Models\MaterialIssuing;
use App\Models\MaterialReceiving;
use App\Models\MaterialStandard;
use App\Models\MaterialStoring;
use App\Models\PipeSchedule;
use App\Models\PipingClassTemplate;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\Scope;
use App\Models\StockMove;
use App\Models\TestPackage;
use App\Models\WeldingMap;
use App\Services\MaterialFlowService;
use App\Services\MaterialRequirementService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        'pipe-standards' => [\App\Models\PipeStandard::class, [
            'create' => 'drawing.write',
            'update' => 'drawing.write',
            'delete' => 'drawing.write',
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
    ];

    /**
     * Resource => permission that lifts the department filter for that resource.
     */
    private array $crossDepartment = [
        'joints' => 'joint.cross',
        // Material Control perlu membaca master Engineering (drawing, katalog
        // standar, BOM) untuk mencocokkan requirement dengan stok. Hak tulis
        // tetap dijaga permission drawing.write di checkWrite().
        'drawings' => 'stock.view',
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
        } elseif ($request->filled('search')) {
            $s = $request->search;
            $col = $res === 'stock' ? 'description' : 'id';
            $q->where($col, 'like', "%{$s}%");
        }

        if ($request->filled('project_id') && \Illuminate\Support\Facades\Schema::hasColumn($q->getModel()->getTable(), 'project_id')) {
            $q->where($q->getModel()->getTable() . '.project_id', $request->project_id);
        }

        // app.jsx memanggil api.get('/x') lalu memakai hasilnya sebagai array langsung.
        return response()->json($q->orderByDesc('id')->get());
    }

    public function show(Request $request, string $res, int $id)
    {
        [$model] = $this->resolve($res);
        $with = match ($res) {
            'joints' => ['inspections'],
            'bill-of-materials' => ['materialStandard', 'drawing'],
            'material-receivings' => ['storing', 'inspections', 'materialStandard', 'documents.uploader:id,name'],
            'material-inspections' => ['receiving.materialStandard'],
            'material-storings' => ['movements.creator', 'receiving', 'materialStandard', 'documents.uploader:id,name'],
            'material-issuings' => ['storing', 'materialStandard', 'drawing', 'bom', 'documents.uploader:id,name'],
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

        if (in_array($res, ['material-receivings', 'material-storings'], true) && empty($data['project_id'])) {
            // Aplikasi saat ini satu project; isi otomatis supaya stok dan
            // issuing ber-link BOM tidak terpisah project-nya.
            $data['project_id'] = Project::query()->orderBy('id')->value('id');
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
            $data['project_id'] = $data['project_id'] ?? $receiving->project_id;
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
        }

        $obj = $model::create($data);

        if ($res === 'joints') {
            $obj->load('inspections');
        } elseif ($res === 'welding-maps') {
            $this->syncWeldingMapToJoint($obj);
        }

        return response()->json($obj, 201);
    }

    public function update(Request $request, string $res, int $id)
    {
        $this->checkWrite($request, $res, 'update');
        [$model] = $this->resolve($res);

        $obj = $this->scope($request, $model::query(), $res)->findOrFail($id);

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
        }

        $obj->update($data);
        if ($res === 'welding-maps') {
            $this->syncWeldingMapToJoint($obj->fresh());
        }

        return response()->json($obj);
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
            \App\Models\Joint::where('drawing_no', $obj->iso_drawing_no)
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

    private function syncWeldingMapToJoint(\App\Models\WeldingMap $map): void
    {
        $jointSeq = null;
        if (preg_match('/(\d+)/', (string) $map->joint_no, $m)) {
            $jointSeq = (int) $m[1];
        }

        $consDeptId = Department::where('code', 'CONS')->value('id') ?? $map->department_id;

        \App\Models\Joint::updateOrCreate(
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

    // Ringkasan angka untuk Overview. Angka mengikuti departemen user.
    public function overview(Request $request)
    {
        // Global dashboard menampilkan ringkasan lintas departemen untuk superadmin dan project manager.
        $canViewAll = $request->user()->isSuperAdmin() || $request->user()->role === 'project_manager';

        $joints = $canViewAll ? Joint::query() : $this->scope($request, Joint::query(), 'joints');
        $inspections = $canViewAll ? Inspection::query() : $this->scope($request, Inspection::query(), 'inspections');
        $stock = $this->scope($request, StockMove::query(), 'stock');
        $testPackages = $this->scope($request, TestPackage::query(), 'test-packages');
        $hse = $this->scope($request, HseLog::query(), 'hse');
        $scopes = $this->scope($request, Scope::query(), 'scopes');
        $daily = $this->scope($request, DailyProgress::query(), 'daily-progress');

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
