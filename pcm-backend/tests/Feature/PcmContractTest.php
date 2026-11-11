<?php

namespace Tests\Feature;

use App\Models\BillOfMaterial;
use App\Models\BudgetItem;
use App\Models\DailyProgress;
use App\Models\Department;
use App\Models\Drawing;
use App\Models\HseLog;
use App\Models\Inspection;
use App\Models\Joint;
use App\Models\LineService;
use App\Models\MaterialDocument;
use App\Models\MaterialInspection;
use App\Models\MaterialIssuing;
use App\Models\MaterialReceiving;
use App\Models\MaterialStandard;
use App\Models\MaterialStockMovement;
use App\Models\MaterialStoring;
use App\Models\PipeSchedule;
use App\Models\FittingStandard;
use App\Models\PipingClassTemplate;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\Scope;
use App\Models\StockMove;
use App\Models\TestPackage;
use App\Models\WeldingMap;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// ponytail: satu test kontrak frontend<->API; tambah kasus baru di sini, bukan file baru.
// Tiap method login sendiri: guard Sanctum menyimpan user per proses PHP,
// request lintas role dalam satu method saling mengotori (qaqc lolos tulis stock).
class PcmContractTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // The shared demo database does not ship with joint/scope rows. These
        // two rows are the minimum fixtures used by the contract cases below.
        if (! Joint::query()->whereKey(1)->exists()) {
            Joint::query()->insert([
                'id' => 1,
                'department_id' => Department::query()->where('code', 'CONS')->value('id'),
                'drawing_no' => '2428-M-15-MPP-AB-SHT1',
                'line_no' => 'MPP-AB',
                'spool_no' => null,
                'seq' => 1,
                'item_a' => 'Flange SO-RF',
                'spec_a' => 'A105',
                'item_b' => 'Pipe',
                'spec_b' => 'A106-B',
                'size_in' => 2.00,
                'shop_field' => 'Shop',
                'joint_type' => 'SW',
                'method' => 'GTAW',
                'wps' => null,
                'welder' => 'W-005',
                'fit_date' => '2026-07-05',
                'weld_date' => '2026-07-06',
                'visual' => 'PASS',
                'status' => 'VISUAL_OK',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (! Scope::query()->whereKey(1)->exists()) {
            Scope::query()->insert([
                'id' => 1,
                'department_id' => Department::query()->where('code', 'PMO')->value('id'),
                'scope' => 'A1.1. Carbon Steel Piping',
                'unit' => 'DI',
                'contract_qty' => 37783.91,
                'cumulative_qty' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function token(string $role): string
    {
        // project_manager memakai alamat manager@ supaya login lama tetap jalan.
        $email = $role === 'project_manager' ? 'manager@pcm.local' : "$role@pcm.local";
        $res = $this->postJson('/api/login', ['email' => $email, 'password' => 'pcm123']);
        $res->assertOk();

        return $res->json('token');
    }

    public function test_index_returns_arrays(): void
    {
        $mgr = $this->token('project_manager');
        // index mengembalikan array langsung (bukan paginator) — sesuai app.jsx
        foreach ([
            'drawings', 'joints', 'stock', 'inspections', 'test-packages', 'hse', 'scopes', 'progress', 'daily-progress',
            'line-services', 'material-standards', 'piping-class-templates', 'pipe-schedules', 'welding-maps', 'bill-of-materials', 'engineering-boqs', 'document-controls',
            'project-milestones', 'budget-items',
            'material-receivings', 'material-inspections', 'material-storings', 'material-issuings',
        ] as $r) {
            $this->getJson("/api/$r", ['Authorization' => "Bearer $mgr"])->assertOk()->assertJsonIsArray();
        }
    }

    public function test_material_role_writes_material_modules(): void
    {
        $mat = $this->token('material');

        // Test receiving write
        $rec = $this->postJson('/api/material-receivings', [
            'arrival_date' => '2026-10-15', 'shipment_no' => 'SJ-TEST-001', 'po_no' => 'PO-TEST',
            'vendor' => 'Test Vendor', 'item_name' => 'Test Pipe', 'description' => 'Test Pipe Desc',
            'specification' => 'ASTM A106', 'size' => '4"', 'heat_no' => 'HT-TEST-01', 'qty' => 10,
        ], ['Authorization' => "Bearer $mat"])->assertCreated()->json();
        $this->assertSame('SJ-TEST-001', $rec['shipment_no']);
        MaterialReceiving::where('shipment_no', 'SJ-TEST-001')->delete();

        // Test storing write
        $stk = $this->postJson('/api/material-storings', [
            'item_code' => 'MAT-TEST-01', 'item_name' => 'Test Storing Item', 'category' => 'PIPE',
            'specification' => 'ASTM A106', 'size' => '4"', 'storage_type' => 'OPEN_YARD',
            'location_detail' => 'Laydown Test', 'stock_in' => 10, 'balance' => 10,
        ], ['Authorization' => "Bearer $mat"])->assertCreated()->json();
        $this->assertSame('MAT-TEST-01', $stk['item_code']);
        MaterialStoring::where('item_code', 'MAT-TEST-01')->delete();

        // Test issuing write
        $iss = $this->postJson('/api/material-issuings', [
            'issue_date' => '2026-10-16', 'issue_no' => 'MIS-TEST-001', 'requestor' => 'Test Requestor',
            'vendor' => 'Test Vendor', 'item_name' => 'Test Pipe', 'description' => 'Test Pipe Desc',
            'specification' => 'ASTM A106', 'size' => '4"', 'schedule_rating' => 'Sch 40', 'qty' => 2,
        ], ['Authorization' => "Bearer $mat"])->assertCreated()->json();
        $this->assertSame('MIS-TEST-001', $iss['issue_no']);
        $this->assertSame('Test Vendor', $iss['vendor']);
        $this->assertSame('Test Pipe Desc', $iss['description']);
        $this->assertSame('Sch 40', $iss['schedule_rating']);
        MaterialIssuing::where('issue_no', 'MIS-TEST-001')->delete();
    }

    public function test_project_manager_writes_milestone_and_budget(): void
    {
        $pm = $this->token('project_manager');

        // Test milestone write
        $m = $this->postJson('/api/project-milestones', [
            'code' => 'M-TEST', 'name' => 'Test Milestone', 'phase' => 'Testing', 'weight_pct' => 5,
        ], ['Authorization' => "Bearer $pm"])->assertCreated()->json();
        $this->assertSame('M-TEST', $m['code']);
        ProjectMilestone::where('code', 'M-TEST')->delete();

        // Test budget item write
        $b = $this->postJson('/api/budget-items', [
            'item_code' => 'BUD-TEST', 'scope_description' => 'Test Scope', 'total_budget' => 1000,
        ], ['Authorization' => "Bearer $pm"])->assertCreated()->json();
        $this->assertSame('BUD-TEST', $b['item_code']);
        $this->assertSame('IDR', $b['currency']);
        BudgetItem::where('item_code', 'BUD-TEST')->delete();
    }

    public function test_engineer_writes_engineering_modules(): void
    {
        $eng = $this->token('engineer');

        // Test write line-service
        $ls = $this->postJson('/api/line-services', [
            'line_no' => 'TEST-LINE-99', 'service_name' => 'Test Service', 'fluid_code' => 'TS',
        ], ['Authorization' => "Bearer $eng"])->assertCreated()->json();
        $this->assertSame('TEST-LINE-99', $ls['line_no']);
        LineService::where('line_no', 'TEST-LINE-99')->delete();

        // Test write welding-map
        $wm = $this->postJson('/api/welding-maps', [
            'iso_drawing_no' => 'DWG-TEST-01', 'spool_no' => 'SP-TEST', 'joint_no' => 'W-TEST-01', 'size' => '2"',
        ], ['Authorization' => "Bearer $eng"])->assertCreated()->json();
        $this->assertSame('W-TEST-01', $wm['joint_no']);
        // Test write pipe-standard
        $ps = $this->postJson('/api/pipe-standards', [
            'nps' => '4"', 'dn' => 'DN 100', 'schedule' => 'Sch 40', 'wall_thickness_mm' => 6.02, 'weight_kg_m' => 16.07
        ], ['Authorization' => "Bearer $eng"])->assertCreated()->json();
        $this->assertSame('4"', $ps['nps']);
        \App\Models\PipeStandard::where('nps', '4"')->delete();

        // Test write drawing with fitup_specs
        $dwg = $this->postJson('/api/drawings', [
            'drawing_no' => 'DWG-FITUP-01',
            'title' => 'Test Fitup Drawing',
            'line_no' => 'TEST-LINE-01',
            'fitup_specs' => [
                ['size' => '4"', 'schedule' => 'Sch 40', 'material_spec' => 'ASTM A106 Gr. B']
            ]
        ], ['Authorization' => "Bearer $eng"])->assertCreated()->json();
        $this->assertSame('DWG-FITUP-01', $dwg['drawing_no']);
        $this->assertIsArray($dwg['fitup_specs']);
        \App\Models\Drawing::where('drawing_no', 'DWG-FITUP-01')->delete();
        WeldingMap::where('joint_no', 'W-TEST-01')->delete();
    }

    public function test_overview_shape(): void
    {
        $mgr = $this->token('project_manager');
        $ov = $this->getJson('/api/overview', ['Authorization' => "Bearer $mgr"])->assertOk()->json();
        $this->assertArrayHasKey('joints_total', $ov);
        $this->assertArrayHasKey('joints_by_status', $ov);
        $this->assertArrayHasKey('ndt_reject_pct', $ov);
    }

    public function test_material_write(): void
    {
        $mat = $this->token('material');
        $sm = $this->postJson('/api/stock', [
            'move_date' => '2026-10-12', 'kind' => 'IN', 'description' => 'PIPA KONTRAK-T',
            'spec' => 'A106', 'size' => '2"', 'qty' => 5, 'unit' => 'MTR',
            'location' => 'Yard A', 'heat_no' => 'H-KT', 'po_no' => 'PO-KT', 'requestor' => 'Shop',
        ], ['Authorization' => "Bearer $mat"])->assertCreated()->json();
        $this->assertSame('H-KT', $sm['heat_no']);
        StockMove::where('description', 'PIPA KONTRAK-T')->delete();
    }

    public function test_joint_status_cannot_skip_construction_stage(): void
    {
        $cons = $this->token('construction');
        $consDept = \App\Models\Department::where('code', 'CONS')->value('id');
        $joint = \App\Models\Joint::create([
            'joint_no' => 'J-TEST-TRANSITION', 'drawing_no' => 'DWG-TRANSITION', 'spool_no' => 'SP-TRANSITION',
            'size' => '4"', 'schedule' => 'Sch 40', 'joint_type' => 'BW', 'location' => 'Shop',
            'status' => 'FITUP_OK', 'dia_inch' => 4.0, 'department_id' => $consDept,
        ]);

        $this->putJson("/api/joints/{$joint->id}", ['status' => 'NDT_OK'],
            ['Authorization' => "Bearer $cons"])->assertStatus(422);

        $joint->delete();
    }

    public function test_qaqc_guards(): void
    {
        $qc = $this->token('qaqc');
        // qaqc dilarang tulis stock (403), boleh tulis inspections
        $this->postJson('/api/stock', ['kind' => 'IN', 'description' => 'X', 'qty' => 1],
            ['Authorization' => "Bearer $qc"])->assertForbidden();

        $consDept = \App\Models\Department::where('code', 'CONS')->value('id');
        $joint = \App\Models\Joint::create([
            'joint_no' => 'J-TEST-QC',
            'drawing_no' => 'DWG-QC',
            'spool_no' => 'SP-QC',
            'size' => '4"',
            'schedule' => 'Sch 40',
            'joint_type' => 'BW',
            'location' => 'Shop',
            'status' => 'FITUP_OK',
            'dia_inch' => 4.0,
            'department_id' => $consDept,
        ]);

        $insp = $this->postJson('/api/inspections', [
            'joint_id' => $joint->id, 'kind' => 'VISUAL', 'result' => 'PASS', 'defect_type' => 'NONE',
            'report_no' => 'QC-KT', 'insp_date' => '2026-10-12', 'inspector' => 'QC', 'remarks' => 'ok',
        ], ['Authorization' => "Bearer $qc"])->assertCreated()->json();
        $this->assertSame('VISUAL', $insp['kind']);
        Inspection::where('report_no', 'QC-KT')->delete();
        $joint->delete();
    }

    public function test_testpackage_write(): void
    {
        $tp = $this->token('testpackage');
        $pkg = $this->postJson('/api/test-packages', [
            'pkg_no' => 'TP-KT', 'system_name' => 'Sys', 'test_kind' => 'Hydro',
            'test_pressure_bar' => 15, 'holding_time_min' => 60,
            'schedule_date' => '2026-10-20', 'status' => 'planned',
        ], ['Authorization' => "Bearer $tp"])->assertCreated()->json();
        $this->assertSame('Sys', $pkg['system_name']);
        TestPackage::where('pkg_no', 'TP-KT')->delete();
    }

    public function test_hse_write(): void
    {
        $hse = $this->token('hse');
        $log = $this->postJson('/api/hse', [
            'log_date' => '2026-10-12', 'kind' => 'tbm', 'description' => 'Briefing KT',
            'action_taken' => 'APD', 'status' => 'open',
        ], ['Authorization' => "Bearer $hse"])->assertCreated()->json();
        $this->assertSame('APD', $log['action_taken']);
        HseLog::where('description', 'Briefing KT')->delete();
    }

    // BOQ dan progres harian adalah artefak Project Management. Sejak department
    // scoping, construction tidak lagi menulis ke dua tabel milik PMO.
    public function test_construction_cannot_write_boq(): void
    {
        $pmoDept = \App\Models\Department::where('code', 'PMO')->value('id');
        $scope = \App\Models\Scope::create([
            'scope' => 'Test Scope',
            'unit' => 'joint',
            'contract_qty' => 10,
            'cumulative_qty' => 0,
            'department_id' => $pmoDept,
        ]);

        $con = $this->token('construction');
        $this->postJson('/api/daily-progress', [
            'prog_date' => '2026-10-12', 'scope' => 'Test Scope',
            'qty' => 7, 'team' => 'construction',
        ], ['Authorization' => "Bearer $con"])->assertForbidden();
        $this->putJson("/api/scopes/{$scope->id}", ['cumulative_qty' => 7],
            ['Authorization' => "Bearer $con"])->assertForbidden();

        $scope->delete();
    }

    public function test_project_manager_writes_progress(): void
    {
        $pmoDept = \App\Models\Department::where('code', 'PMO')->value('id');
        $scope = \App\Models\Scope::create([
            'scope' => 'Test Scope PM',
            'unit' => 'joint',
            'contract_qty' => 10,
            'cumulative_qty' => 0,
            'department_id' => $pmoDept,
        ]);

        $pm = $this->token('project_manager');
        $this->postJson('/api/daily-progress', [
            'prog_date' => '2026-10-12', 'scope' => 'Test Scope PM',
            'qty' => 7, 'team' => 'project_manager',
        ], ['Authorization' => "Bearer $pm"])->assertCreated();
        $this->putJson("/api/scopes/{$scope->id}", ['cumulative_qty' => 7],
            ['Authorization' => "Bearer $pm"])->assertOk();
        $cum = $this->getJson("/api/scopes/{$scope->id}", ['Authorization' => "Bearer $pm"])->assertOk()->json('cumulative_qty');
        $this->assertEquals(7, $cum);
        \App\Models\DailyProgress::where('scope', 'Test Scope PM')->where('qty', 7)->delete();
        $scope->delete();
    }

    public function test_department_scoping_blocks_cross_department_read(): void
    {
        // Joint milik departemen CONS. Material (MAT) tidak boleh melihatnya.
        $mat = $this->token('material');
        $this->getJson('/api/joints', ['Authorization' => "Bearer $mat"])
            ->assertOk()->assertJsonCount(0);

        // QA/QC punya joint.cross, jadi tetap melihat joint construction.
        $qc = $this->token('qaqc');
        $this->getJson('/api/joints', ['Authorization' => "Bearer $qc"])
            ->assertOk();
    }

    public function test_superadmin_sees_every_department(): void
    {
        $sa = $this->token('superadmin');
        $this->getJson('/api/joints', ['Authorization' => "Bearer $sa"])
            ->assertOk()->assertJsonCount(Joint::count());
        $this->getJson('/api/admin/departments', ['Authorization' => "Bearer $sa"])
            ->assertOk()->assertJsonCount(Department::count());
    }

    public function test_admin_area_is_closed_to_operational_roles(): void
    {
        $eng = $this->token('engineer');
        $this->getJson('/api/admin/users', ['Authorization' => "Bearer $eng"])->assertForbidden();
        $this->postJson('/api/admin/users', [], ['Authorization' => "Bearer $eng"])->assertForbidden();
    }

    public function test_unauthenticated_401(): void
    {
        // tanpa token -> 401 (method sendiri = app fresh, tanpa sisa auth)
        $this->getJson('/api/joints')->assertUnauthorized();
    }

    public function test_material_flow_request_inspect_stock_issue_cancel(): void
    {
        $suffix = substr(uniqid(), -6);
        $shipment = "SJ-FLOW-{$suffix}";
        $report = "MIR-FLOW-{$suffix}";
        $materialReport = "MIR-MAT-{$suffix}";
        $issue = "MIS-FLOW-{$suffix}";
        $overIssue = "MIS-OVER-{$suffix}";
        $heat = "HT-FLOW-{$suffix}";

        $receiving = null;
        $inspection = null;
        $stock = null;
        $issuing = null;

        try {
            $mat = $this->token('material');

            $rec = $this->postJson('/api/material-receivings', [
                'arrival_date' => '2026-10-20',
                'shipment_no' => $shipment,
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-FLOW',
                'vendor' => 'Flow Vendor',
                'item_name' => 'Flow Pipe',
                'category' => 'PIPE',
                'description' => 'Flow test pipe',
                'specification' => 'ASTM A106',
                'size' => '4"',
                'schedule_rating' => 'Sch 40',
                'heat_no' => $heat,
                'qty' => 10,
                'unit' => 'meter',
                'packing_type' => 'Bundle',
                'storage_type' => 'OPEN_YARD',
                'storage_location' => 'Flow Yard',
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated()->json();

            $receiving = MaterialReceiving::findOrFail($rec['id']);
            $this->assertSame('RECEIVED', $receiving->status);

            $this->postJson(
                "/api/material-receivings/{$receiving->id}/request-inspection",
                [],
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk();

            $this->assertSame('REQUESTED', $receiving->fresh()->status);

            // Material owns receiving/storing/issuing, but QC owns the result.
            $this->postJson('/api/material-inspections', [
                'material_receiving_id' => $receiving->id,
                'report_no' => $materialReport,
                'inspection_date' => '2026-10-20',
                'inspector_name' => 'Material User',
                'item_name' => 'Flow Pipe',
                'heat_no' => $heat,
                'result' => 'ACCEPTED',
            ], ['Authorization' => "Bearer {$mat}"])->assertForbidden();

            // Sanctum caches the resolved user per test process; clear it before
            // switching role so the next token is actually evaluated.
            $this->app['auth']->forgetGuards();
            $qc = $this->token('qaqc');

            $insp = $this->postJson('/api/material-inspections', [
                'material_receiving_id' => $receiving->id,
                'report_no' => $report,
                'inspection_date' => '2026-10-20',
                'inspector_name' => 'QC Inspector',
                'item_name' => 'Flow Pipe',
                'heat_no' => $heat,
                'visual_check' => 'PASS',
                'dimension_check' => 'PASS',
                'mtc_check' => 'PASS',
                'result' => 'ACCEPTED',
                'accepted_qty' => 10,
            ], ['Authorization' => "Bearer {$qc}"])->assertCreated()->json();

            $inspection = MaterialInspection::findOrFail($insp['id']);
            $this->assertSame('ACCEPTED', $inspection->result);

            $receiving->refresh();
            $this->assertSame('ACCEPTED', $receiving->status);
            $this->assertSame(10.0, (float) $receiving->accepted_qty);

            $stock = MaterialStoring::where('receiving_id', $receiving->id)->firstOrFail();
            $this->assertSame('AVAILABLE', $stock->status);
            $this->assertSame(10.0, (float) $stock->stock_in);
            $this->assertSame(10.0, (float) $stock->balance);
            $this->assertDatabaseHas('material_stock_movements', [
                'material_storing_id' => $stock->id,
                'type' => 'IN',
                'reference_type' => 'inspection',
                'reference_id' => $inspection->id,
            ]);

            $this->app['auth']->forgetGuards();
            $mat = $this->token('material');

            $stockDetail = $this->getJson(
                "/api/material-storings/{$stock->id}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertCount(1, $stockDetail['movements']);
            $this->assertSame('inspection', $stockDetail['movements'][0]['reference_type']);

            $this->postJson("/api/material-storings/{$stock->id}/transfer", [
                'storage_type' => 'WAREHOUSE',
                'location_detail' => 'Flow Warehouse',
                'notes' => 'E2E transfer',
            ], ['Authorization' => "Bearer {$mat}"])->assertOk();

            $this->assertSame('WAREHOUSE', $stock->fresh()->storage_type);
            $this->assertDatabaseHas('material_stock_movements', [
                'material_storing_id' => $stock->id,
                'type' => 'TRANSFER',
                'to_location' => 'Flow Warehouse',
            ]);

            $this->postJson('/api/material-issuings', [
                'material_storing_id' => $stock->id,
                'issue_date' => '2026-10-20',
                'issue_no' => $overIssue,
                'requestor' => 'Flow Team',
                'target_spool_no' => 'SP-FLOW',
                'target_line_no' => '15-MPP-AB',
                'drawing_no' => 'FLOW-ISO',
                'qty' => 20,
                'unit' => 'meter',
                'issued_by' => 'Material Control',
            ], ['Authorization' => "Bearer {$mat}"])->assertStatus(422);

            $this->assertSame(10.0, (float) $stock->fresh()->balance);

            $iss = $this->postJson('/api/material-issuings', [
                'material_storing_id' => $stock->id,
                'issue_date' => '2026-10-20',
                'issue_no' => $issue,
                'requestor' => 'Flow Team',
                'target_spool_no' => 'SP-FLOW',
                'target_line_no' => '15-MPP-AB',
                'drawing_no' => 'FLOW-ISO',
                'qty' => 4,
                'unit' => 'meter',
                'issued_by' => 'Material Control',
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated()->json();

            $issuing = MaterialIssuing::findOrFail($iss['id']);
            $this->assertSame($stock->id, $issuing->material_storing_id);
            $this->assertSame(6.0, (float) $stock->fresh()->balance);
            $this->assertSame(4.0, (float) $stock->fresh()->stock_out);

            $this->deleteJson(
                "/api/material-issuings/{$issuing->id}",
                [],
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk();

            $issuing->refresh();
            $this->assertSame('CANCELLED', $issuing->status);
            $this->assertSame(10.0, (float) $stock->fresh()->balance);
            $this->assertSame(0.0, (float) $stock->fresh()->stock_out);
        } finally {
            if ($issuing) {
                $issuing->delete();
            }

            MaterialIssuing::where('issue_no', $overIssue)->delete();

            if ($stock) {
                MaterialStockMovement::where('material_storing_id', $stock->id)->delete();
                $stock->delete();
            }

            if ($inspection) {
                $inspection->delete();
            }

            MaterialInspection::where('report_no', $materialReport)->delete();

            if ($receiving) {
                $receiving->delete();
            }
        }
    }

    public function test_material_requirement_dashboard_links_bom_stock_and_issuing(): void
    {
        $suffix = substr(uniqid(), -6);
        $standardCode = "STD-REQ-{$suffix}";
        $shipment = "SJ-REQ-{$suffix}";
        $report = "MIR-REQ-{$suffix}";
        $issueOne = "MIS-REQ-A-{$suffix}";
        $issueTwo = "MIS-REQ-B-{$suffix}";
        $heat = "HT-REQ-{$suffix}";
        $drawingNo = "ISO-REQ-{$suffix}";

        $standard = null;
        $drawing = null;
        $bom = null;
        $receiving = null;
        $inspection = null;
        $stock = null;

        try {
            $projectId = Project::query()->value('id');
            $this->assertNotNull($projectId);

            $eng = $this->token('engineer');

            $std = $this->postJson('/api/material-standards', [
                'code' => $standardCode,
                'category' => 'Pipe',
                'specification' => 'ASTM A106 Gr. B Requirement Test',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40',
                'size_range' => '4"',
                'description' => 'Standar uji rekonsiliasi requirement.',
            ], ['Authorization' => "Bearer {$eng}"])->assertCreated()->json();

            $standard = MaterialStandard::findOrFail($std['id']);

            $drw = $this->postJson('/api/drawings', [
                'project_id' => $projectId,
                'drawing_no' => $drawingNo,
                'line_no' => '15-MPP-AB',
                'title' => 'Requirement reconciliation test',
                'status' => 'IFC',
            ], ['Authorization' => "Bearer {$eng}"])->assertCreated()->json();

            $drawing = Drawing::findOrFail($drw['id']);

            $bomData = $this->postJson('/api/bill-of-materials', [
                'project_id' => $projectId,
                'drawing_id' => $drawing->id,
                'material_standard_id' => $standard->id,
                'spool_no' => 'SP-REQ',
                'item_no' => '1',
                'component_type' => 'Pipe',
                'description' => 'BOM requirement pipe',
                'size' => '4"',
                'rating_sch' => 'Sch 40',
                'material_spec' => 'ASTM A106 Gr. B BOM',
                'qty' => 10,
                'unit' => 'meter',
            ], ['Authorization' => "Bearer {$eng}"])->assertCreated()->json();

            $bom = BillOfMaterial::findOrFail($bomData['id']);

            $this->app['auth']->forgetGuards();
            $mat = $this->token('material');

            $rec = $this->postJson('/api/material-receivings', [
                'arrival_date' => '2026-10-22',
                'shipment_no' => $shipment,
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-REQ',
                'vendor' => 'Requirement Vendor',
                'item_name' => 'Requirement flow pipe',
                'category' => 'PIPE',
                'material_standard_id' => $standard->id,
                'description' => 'Requirement flow pipe',
                'specification' => 'ASTM A106 Gr. B',
                'size' => '4"',
                'schedule_rating' => 'Sch 40',
                'heat_no' => $heat,
                'qty' => 10,
                'unit' => 'meter',
                'storage_type' => 'OPEN_YARD',
                'storage_location' => 'Requirement Yard',
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated()->json();

            $receiving = MaterialReceiving::findOrFail($rec['id']);

            $this->postJson(
                "/api/material-receivings/{$receiving->id}/request-inspection",
                [],
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk();

            $this->app['auth']->forgetGuards();
            $qc = $this->token('qaqc');

            $insp = $this->postJson('/api/material-inspections', [
                'material_receiving_id' => $receiving->id,
                'report_no' => $report,
                'inspection_date' => '2026-10-22',
                'inspector_name' => 'QC Requirement',
                'item_name' => 'Requirement flow pipe',
                'heat_no' => $heat,
                'visual_check' => 'PASS',
                'dimension_check' => 'PASS',
                'mtc_check' => 'PASS',
                'result' => 'ACCEPTED',
                'accepted_qty' => 10,
            ], ['Authorization' => "Bearer {$qc}"])->assertCreated()->json();

            $inspection = MaterialInspection::findOrFail($insp['id']);
            $stock = MaterialStoring::where('receiving_id', $receiving->id)->firstOrFail();

            $this->assertSame((int) $standard->id, (int) $stock->material_standard_id);

            $this->app['auth']->forgetGuards();
            $mat = $this->token('material');

            $firstIssue = $this->postJson('/api/material-issuings', [
                'material_storing_id' => $stock->id,
                'drawing_id' => $drawing->id,
                'bom_id' => $bom->id,
                'issue_date' => '2026-10-22',
                'issue_no' => $issueOne,
                'requestor' => 'Requirement Team',
                'target_spool_no' => 'SP-REQ',
                'target_line_no' => '15-MPP-AB',
                'drawing_no' => $drawingNo,
                'qty' => 6,
                'unit' => 'meter',
                'issued_by' => 'Material Control',
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated()->json();

            $firstIssuing = MaterialIssuing::findOrFail($firstIssue['id']);
            $this->assertSame((int) $bom->id, (int) $firstIssuing->bom_id);
            $this->assertSame((int) $drawing->id, (int) $firstIssuing->drawing_id);
            $this->assertSame((int) $standard->id, (int) $firstIssuing->material_standard_id);
            $this->assertSame($stock->item_name, $firstIssuing->item_name);
            $this->assertSame($stock->specification, $firstIssuing->specification);

            $requirements = $this->getJson(
                "/api/material-requirements?drawing_id={$drawing->id}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame(1, $requirements['summary']['total_lines']);
            $this->assertSame(1, $requirements['summary']['shortage_lines']);
            $this->assertCount(1, $requirements['rows']);

            $row = $requirements['rows'][0];
            $this->assertSame($standardCode, $row['standard_code']);
            $this->assertSame(10.0, (float) $row['required_qty']);
            $this->assertSame(6.0, (float) $row['issued_qty']);
            $this->assertSame(4.0, (float) $row['remaining_qty']);
            $this->assertSame(4.0, (float) $row['stock_balance']);
            $this->assertSame(10.0, (float) $row['received_qty']);
            $this->assertSame('SHORTAGE', $row['status']);
            $this->assertSame('STOCK_READY', $row['procurement']);

            $projectRequirements = $this->getJson(
                "/api/material-requirements?project_id={$projectId}&drawing_id={$drawing->id}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertCount(1, $projectRequirements['rows']);
            $this->assertSame(4.0, (float) $projectRequirements['rows'][0]['stock_balance']);

            $this->putJson(
                "/api/material-issuings/{$firstIssuing->id}",
                ['qty' => 7],
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk();

            $updatedRequirements = $this->getJson(
                "/api/material-requirements?drawing_id={$drawing->id}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame(7.0, (float) $updatedRequirements['rows'][0]['issued_qty']);
            $this->assertSame(3.0, (float) $updatedRequirements['rows'][0]['stock_balance']);

            $this->postJson('/api/material-issuings', [
                'material_storing_id' => $stock->id,
                'drawing_id' => $drawing->id,
                'bom_id' => $bom->id,
                'issue_date' => '2026-10-22',
                'issue_no' => $issueTwo,
                'requestor' => 'Requirement Team',
                'target_spool_no' => 'SP-REQ',
                'target_line_no' => '15-MPP-AB',
                'drawing_no' => $drawingNo,
                'qty' => 3,
                'unit' => 'meter',
                'issued_by' => 'Material Control',
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated();

            $requirements = $this->getJson(
                "/api/material-requirements?drawing_id={$drawing->id}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame(0, $requirements['summary']['shortage_lines']);
            $this->assertSame(1, $requirements['summary']['fulfilled_lines']);
            $this->assertSame(10.0, (float) $requirements['rows'][0]['issued_qty']);
            $this->assertSame(0.0, (float) $requirements['rows'][0]['remaining_qty']);
            $this->assertSame('FULFILLED', $requirements['rows'][0]['status']);

            $this->app['auth']->forgetGuards();
            $eng = $this->token('engineer');
            $this->getJson(
                "/api/material-requirements?drawing_id={$drawing->id}",
                ['Authorization' => "Bearer {$eng}"]
            )->assertForbidden();
        } finally {
            MaterialIssuing::whereIn('issue_no', [$issueOne, $issueTwo])->delete();

            if ($stock) {
                MaterialStockMovement::where('material_storing_id', $stock->id)->delete();
                $stock->delete();
            }

            if ($inspection) {
                $inspection->delete();
            }

            if ($receiving) {
                $receiving->delete();
            }

            if ($bom) {
                $bom->delete();
            }

            if ($drawing) {
                $drawing->delete();
            }

            if ($standard) {
                $standard->delete();
            }
        }
    }

    public function test_material_reports_and_document_uploads(): void
    {
        Storage::fake('local');

        $suffix = substr(uniqid(), -6);
        $shipment = "SJ-REPORT-{$suffix}";
        $issueNo = "MIS-REPORT-{$suffix}";
        $itemCode = "MAT-REPORT-{$suffix}";
        $location = "Report Yard {$suffix}";

        $receiving = null;
        $issuing = null;
        $stock = null;

        try {
            $mat = $this->token('material');

            $rec = $this->postJson('/api/material-receivings', [
                'arrival_date' => '2026-10-22',
                'shipment_no' => $shipment,
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-REPORT',
                'vendor' => 'Report Vendor',
                'item_name' => 'Report Pipe',
                'category' => 'PIPE',
                'description' => 'Report test pipe',
                'specification' => 'ASTM A106',
                'size' => '4"',
                'schedule_rating' => 'Sch 40',
                'heat_no' => "HT-REPORT-{$suffix}",
                'mtc_no' => "MTC-REPORT-{$suffix}",
                'qty' => 8,
                'unit' => 'meter',
                'storage_type' => 'OPEN_YARD',
                'storage_location' => $location,
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated()->json();

            $receiving = MaterialReceiving::findOrFail($rec['id']);

            $packing = $this->post('/api/material-documents', [
                'documentable_type' => 'receiving',
                'documentable_id' => $receiving->id,
                'category' => 'PACKING_LIST',
                'notes' => 'Packing list report test',
                'file' => UploadedFile::fake()->create('packing-list.pdf', 120, 'application/pdf'),
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated()->json();

            $this->assertSame('packing-list.pdf', $packing['original_name']);
            $this->assertSame('Packing List', $packing['category_label']);
            $this->assertStringContainsString('/api/material-documents/', $packing['download_url']);

            $receivingDocuments = $this->getJson(
                "/api/material-documents?documentable_type=receiving&documentable_id={$receiving->id}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->assertJsonCount(1)->json();

            $packingPath = MaterialDocument::findOrFail($receivingDocuments[0]['id'])->file_path;
            Storage::disk('local')->assertExists($packingPath);

            $this->get(
                "/api/material-documents/{$receivingDocuments[0]['id']}/download",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk();

            $stockRow = $this->postJson('/api/material-storings', [
                'item_code' => $itemCode,
                'item_name' => 'Report stock item',
                'category' => 'PIPE',
                'specification' => 'ASTM A106',
                'size' => '4"',
                'schedule_rating' => 'Sch 40',
                'heat_no' => "HT-REPORT-{$suffix}",
                'storage_type' => 'OPEN_YARD',
                'location_detail' => $location,
                'stock_in' => 5,
                'balance' => 5,
                'unit' => 'meter',
                'min_stock_alert' => 2,
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated()->json();

            $stock = MaterialStoring::findOrFail($stockRow['id']);

            $this->post('/api/material-documents', [
                'documentable_type' => 'storing',
                'documentable_id' => $stock->id,
                'category' => 'MAPPING',
                'file' => UploadedFile::fake()->create('site-plan.pdf', 180, 'application/pdf'),
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated();

            $issue = $this->postJson('/api/material-issuings', [
                'material_storing_id' => $stock->id,
                'issue_date' => '2026-10-22',
                'issue_no' => $issueNo,
                'requestor' => 'Report Team',
                'target_spool_no' => 'SP-REPORT',
                'target_line_no' => '15-MPP-AB',
                'drawing_no' => 'REPORT-ISO',
                'qty' => 2,
                'unit' => 'meter',
                'issued_by' => 'Material Control',
            ], ['Authorization' => "Bearer {$mat}"])->assertCreated()->json();

            $issuing = MaterialIssuing::findOrFail($issue['id']);

            $receivingReport = $this->getJson(
                "/api/material-reports/receiving?search={$shipment}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame('Material Receiving Report', $receivingReport['meta']['title']);
            $this->assertSame(1, $receivingReport['summary']['total_batches']);
            $this->assertCount(1, $receivingReport['rows']);
            $this->assertSame($shipment, $receivingReport['rows'][0]['shipment_no']);
            $this->assertSame(1, $receivingReport['rows'][0]['documents_count']);

            $issuingReport = $this->getJson(
                "/api/material-reports/issuing?search={$issueNo}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame(1, $issuingReport['summary']['total_slips']);
            $this->assertSame('ISSUED', $issuingReport['rows'][0]['status']);
            $this->assertSame($issueNo, $issuingReport['rows'][0]['issue_no']);

            $stockReport = $this->getJson(
                "/api/material-reports/stock?search={$itemCode}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame(1, $stockReport['summary']['total_items']);
            $this->assertSame($itemCode, $stockReport['rows'][0]['item_code']);
            $this->assertSame(3.0, (float) $stockReport['rows'][0]['balance']);
            $this->assertSame(1, $stockReport['rows'][0]['documents_count']);

            $acceptedOnly = $this->getJson(
                "/api/material-reports/receiving?search={$shipment}&status=ACCEPTED",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame(0, $acceptedOnly['summary']['total_batches']);

            $warehouseStock = $this->getJson(
                "/api/material-reports/stock?search={$itemCode}&storage_type=WAREHOUSE",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame(0, $warehouseStock['summary']['total_items']);

            $lowStock = $this->getJson(
                "/api/material-reports/stock?search={$itemCode}&stock_status=LOW",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame(0, $lowStock['summary']['total_items']);

            $mapReport = $this->getJson(
                "/api/material-reports/location-map?search={$itemCode}",
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk()->json();

            $this->assertSame(1, $mapReport['summary']['total_locations']);
            $this->assertSame(1, $mapReport['summary']['mapping_documents']);
            $this->assertSame($location, $mapReport['rows'][0]['location_detail']);
            $this->assertSame($itemCode, $mapReport['rows'][0]['items'][0]['item_code']);
            $this->assertCount(1, $mapReport['rows'][0]['mapping_documents']);

            $this->app['auth']->forgetGuards();
            $eng = $this->token('engineer');

            $this->getJson(
                "/api/material-reports/stock?search={$itemCode}",
                ['Authorization' => "Bearer {$eng}"]
            )->assertForbidden();

            $this->app['auth']->forgetGuards();

            $this->deleteJson(
                "/api/material-documents/{$receivingDocuments[0]['id']}",
                [],
                ['Authorization' => "Bearer {$mat}"]
            )->assertOk();

            $this->assertSame(0, MaterialDocument::whereKey($receivingDocuments[0]['id'])->count());
            Storage::disk('local')->assertMissing($packingPath);
        } finally {
            if ($issuing) {
                $issuing->delete();
            }

            if ($stock) {
                $stock->documents()->get()->each->delete();
                MaterialStockMovement::where('material_storing_id', $stock->id)->delete();
                $stock->delete();
            }

            if ($receiving) {
                $receiving->documents()->get()->each->delete();
                $receiving->delete();
            }
        }
    }

    public function test_engineer_generates_auto_bom(): void
    {
        $eng = $this->token('engineer');
        $drawing = Drawing::create([
            'drawing_no' => 'TEST-ISO-01',
            'line_no' => '15-MPP-AB',
            'area' => 'MPP',
            'rev' => '0',
            'status' => 'IFC',
            'size_range' => '4"-8"',
            'total_dia_inch' => 10.00,
            'total_joints' => 5,
        ]);

        try {
            $first = $this->postJson("/api/drawings/{$drawing->id}/generate-bom", [], [
                'Authorization' => "Bearer {$eng}",
            ])->assertOk()->assertJsonStructure(['message', 'piping_class', 'count', 'items']);

            $count = $first->json('count');
            $this->assertGreaterThan(0, $count);
            $this->assertSame($count, BillOfMaterial::where('drawing_id', $drawing->id)->where('source', 'GENERATED')->count());
            $this->assertSame('SP-01', $first->json('items.0.spool_no'));

            // Generate ulang harus mengganti draft lama, bukan menduplikasi.
            $this->postJson("/api/drawings/{$drawing->id}/generate-bom", [], [
                'Authorization' => "Bearer {$eng}",
            ])->assertOk();

            $this->assertSame($count, BillOfMaterial::where('drawing_id', $drawing->id)->where('source', 'GENERATED')->count());

            // Material Control tidak boleh men-generate BOM (butuh drawing.write).
            $this->app['auth']->forgetGuards();
            $mat = $this->token('material');

            $this->postJson("/api/drawings/{$drawing->id}/generate-bom", [], [
                'Authorization' => "Bearer {$mat}",
            ])->assertForbidden();
        } finally {
            BillOfMaterial::where('drawing_id', $drawing->id)->delete();
            $drawing->delete();
        }
    }

    public function test_auto_bom_pipe_rows_use_pipe_schedule_master(): void
    {
        $eng = $this->token('engineer');
        $createdSchedule = ! PipeSchedule::query()
            ->where('nominal_size', '4')
            ->where('schedule', 'Sch 40')
            ->exists();

        $schedule = PipeSchedule::firstOrCreate(
            ['nominal_size' => '4', 'schedule' => 'Sch 40'],
            ['nps_mm' => 100, 'od_mm' => 114.30, 'wall_mm' => 6.02, 'weight_kg_m' => 16.07]
        );

        $drawing = Drawing::create([
            'drawing_no' => 'TEST-ISO-PS-01',
            'line_no' => '15-MPP-AB',
            'area' => 'MPP',
            'rev' => '0',
            'status' => 'IFC',
            'size_range' => '4"-8"',
            'total_dia_inch' => 10.00,
            'total_joints' => 5,
        ]);

        try {
            $this->postJson("/api/drawings/{$drawing->id}/generate-bom", [], [
                'Authorization' => "Bearer {$eng}",
            ])->assertOk();

            $pipe = BillOfMaterial::query()
                ->where('drawing_id', $drawing->id)
                ->where('component_type', 'Pipe')
                ->first();

            $this->assertNotNull($pipe);
            $this->assertSame((float) $schedule->od_mm, (float) $pipe->od_mm);
            $this->assertSame((float) $schedule->wall_mm, (float) $pipe->wall_mm);
            $this->assertSame(
                round((float) $pipe->qty * (float) $schedule->weight_kg_m, 2),
                (float) $pipe->weight_kg
            );
        } finally {
            BillOfMaterial::where('drawing_id', $drawing->id)->delete();
            $drawing->delete();

            if ($createdSchedule) {
                $schedule->delete();
            }
        }
    }

    public function test_auto_bom_fitting_rows_use_fitting_standard_master(): void
    {
        $eng = $this->token('engineer');

        $drawing = Drawing::create([
            'drawing_no' => 'TEST-ISO-FIT-01',
            'line_no' => '15-MPP-AB',
            'area' => 'MPP',
            'rev' => '0',
            'status' => 'IFC',
            'size_range' => '4"-8"',
            'total_dia_inch' => 10.00,
            'total_joints' => 5,
        ]);

        try {
            $this->postJson("/api/drawings/{$drawing->id}/generate-bom", [], [
                'Authorization' => "Bearer {$eng}",
            ])->assertOk();

            $elbow = BillOfMaterial::query()
                ->where('drawing_id', $drawing->id)
                ->where('component_type', 'Elbow 90 LR')
                ->first();

            $this->assertNotNull($elbow);
            $this->assertEquals(114.30, (float) $elbow->od_mm);
            $this->assertEquals(6.02, (float) $elbow->wall_mm);
            // Default qty = 5 * 1.0 ratio = 5 buah * 3.84 kg (CS) = 19.2 kg
            $this->assertGreaterThan(0, (float) $elbow->weight_kg);

            // Uji BOM Stainless Steel fitting: harus menggunakan weight_ss_kg
            $ssElbowRes = $this->postJson('/api/bill-of-materials', [
                'drawing_id' => $drawing->id,
                'component_type' => 'Elbow 90 LR',
                'size' => '4"',
                'rating_sch' => 'Sch 40',
                'material_spec' => 'ASTM A403 WP316L',
                'qty' => 2,
                'unit' => 'buah',
            ], [
                'Authorization' => "Bearer {$eng}",
            ])->assertStatus(201);

            $ssData = $ssElbowRes->json();
            $this->assertEquals(114.30, (float) $ssData['od_mm']);
            $this->assertEquals(6.02, (float) $ssData['wall_mm']);
            // 2 * 3.898 kg (SS) = 7.80 kg
            $this->assertEquals(7.80, (float) $ssData['weight_kg']);
        } finally {
            BillOfMaterial::where('drawing_id', $drawing->id)->delete();
            $drawing->delete();
        }
    }

    public function test_fitting_standards_lookup_endpoint(): void
    {
        $eng = $this->token('engineer');

        // 1. Lookup Elbow LR
        $res = $this->getJson('/api/fitting-standards/lookup?component_type=Elbow 90 LR&size=4"&rating_sch=Sch 40&material_spec=ASTM A234 WPB', [
            'Authorization' => "Bearer {$eng}",
        ])->assertOk();

        $res->assertJson([
            'found' => true,
            'od_mm' => 114.3,
            'wall_mm' => 6.02,
            'unit_weight_kg' => 3.84,
            'is_stainless' => false,
        ]);

        // 2. Lookup Reducer Con
        $redRes = $this->getJson('/api/fitting-standards/lookup?component_type=Concentric Reducer&size=6"x3"&rating_sch=Sch 40&material_spec=ASTM A403 WP304', [
            'Authorization' => "Bearer {$eng}",
        ])->assertOk();

        $redRes->assertJson([
            'found' => true,
            'od_mm' => 168.3,
            'is_stainless' => true,
        ]);
        $this->assertGreaterThan(0, $redRes->json('unit_weight_kg'));
    }

    public function test_piping_class_template_crud_uses_engineering_permission(): void
    {
        $eng = $this->token('engineer');
        $payload = [
            'piping_class' => 'TST1',
            'component_type' => 'Test Spool',
            'description' => 'Template uji kontrak',
            'default_rating_sch' => 'Sch 40',
            'material_spec' => 'ASTM A106 Gr. B',
            'unit' => 'buah',
            'ratio_formula' => 1,
            'basis' => 'PER_JOINT',
        ];

        try {
            $created = $this->postJson('/api/piping-class-templates', $payload, [
                'Authorization' => "Bearer {$eng}",
            ])->assertCreated()->json();

            $this->assertSame('TST1', $created['piping_class']);

            // Kombinasi class + komponen tidak boleh duplikat.
            $this->postJson('/api/piping-class-templates', $payload, [
                'Authorization' => "Bearer {$eng}",
            ])->assertStatus(422);

            $this->app['auth']->forgetGuards();
            $mat = $this->token('material');

            $this->getJson('/api/piping-class-templates', [
                'Authorization' => "Bearer {$mat}",
            ])->assertOk();

            $this->postJson('/api/piping-class-templates', array_merge($payload, [
                'component_type' => 'Test Spool 2',
            ]), ['Authorization' => "Bearer {$mat}"])->assertForbidden();

            $this->app['auth']->forgetGuards();

            $this->deleteJson("/api/piping-class-templates/{$created['id']}", [], [
                'Authorization' => "Bearer {$eng}",
            ])->assertOk();
        } finally {
            PipingClassTemplate::where('piping_class', 'TST1')->delete();
        }
    }
}
