<?php

namespace Tests\Feature;

use Tests\TestCase;

// ponytail: satu test kontrak frontend<->API; tambah kasus baru di sini, bukan file baru.
// Tiap method login sendiri: guard Sanctum menyimpan user per proses PHP,
// request lintas role dalam satu method saling mengotori (qaqc lolos tulis stock).
class PcmContractTest extends TestCase
{
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
            'line-services', 'material-standards', 'welding-maps', 'bill-of-materials', 'engineering-boqs', 'document-controls',
            'project-milestones', 'budget-items'
        ] as $r) {
            $this->getJson("/api/$r", ['Authorization' => "Bearer $mgr"])->assertOk()->assertJsonIsArray();
        }
    }

    public function test_project_manager_writes_milestone_and_budget(): void
    {
        $pm = $this->token('project_manager');

        // Test milestone write
        $m = $this->postJson('/api/project-milestones', [
            'code' => 'M-TEST', 'name' => 'Test Milestone', 'phase' => 'Testing', 'weight_pct' => 5,
        ], ['Authorization' => "Bearer $pm"])->assertCreated()->json();
        $this->assertSame('M-TEST', $m['code']);
        \App\Models\ProjectMilestone::where('code', 'M-TEST')->delete();

        // Test budget item write
        $b = $this->postJson('/api/budget-items', [
            'item_code' => 'BUD-TEST', 'scope_description' => 'Test Scope', 'total_budget' => 1000,
        ], ['Authorization' => "Bearer $pm"])->assertCreated()->json();
        $this->assertSame('BUD-TEST', $b['item_code']);
        \App\Models\BudgetItem::where('item_code', 'BUD-TEST')->delete();
    }

    public function test_engineer_writes_engineering_modules(): void
    {
        $eng = $this->token('engineer');

        // Test write line-service
        $ls = $this->postJson('/api/line-services', [
            'line_no' => 'TEST-LINE-99', 'service_name' => 'Test Service', 'fluid_code' => 'TS',
        ], ['Authorization' => "Bearer $eng"])->assertCreated()->json();
        $this->assertSame('TEST-LINE-99', $ls['line_no']);
        \App\Models\LineService::where('line_no', 'TEST-LINE-99')->delete();

        // Test write welding-map
        $wm = $this->postJson('/api/welding-maps', [
            'iso_drawing_no' => 'DWG-TEST-01', 'spool_no' => 'SP-TEST', 'joint_no' => 'W-TEST-01', 'size' => '2"',
        ], ['Authorization' => "Bearer $eng"])->assertCreated()->json();
        $this->assertSame('W-TEST-01', $wm['joint_no']);
        \App\Models\WeldingMap::where('joint_no', 'W-TEST-01')->delete();
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
        \App\Models\StockMove::where('description', 'PIPA KONTRAK-T')->delete();
    }

    public function test_qaqc_guards(): void
    {
        $qc = $this->token('qaqc');
        // qaqc dilarang tulis stock (403), boleh tulis inspections
        $this->postJson('/api/stock', ['kind' => 'IN', 'description' => 'X', 'qty' => 1],
            ['Authorization' => "Bearer $qc"])->assertForbidden();
        $insp = $this->postJson('/api/inspections', [
            'joint_id' => 1, 'kind' => 'VISUAL', 'result' => 'PASS', 'defect_type' => 'NONE',
            'report_no' => 'QC-KT', 'insp_date' => '2026-10-12', 'inspector' => 'QC', 'remarks' => 'ok',
        ], ['Authorization' => "Bearer $qc"])->assertCreated()->json();
        $this->assertSame('VISUAL', $insp['kind']);
        \App\Models\Inspection::where('report_no', 'QC-KT')->delete();
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
        \App\Models\TestPackage::where('pkg_no', 'TP-KT')->delete();
    }

    public function test_hse_write(): void
    {
        $hse = $this->token('hse');
        $log = $this->postJson('/api/hse', [
            'log_date' => '2026-10-12', 'kind' => 'tbm', 'description' => 'Briefing KT',
            'action_taken' => 'APD', 'status' => 'open',
        ], ['Authorization' => "Bearer $hse"])->assertCreated()->json();
        $this->assertSame('APD', $log['action_taken']);
        \App\Models\HseLog::where('description', 'Briefing KT')->delete();
    }

    // BOQ dan progres harian adalah artefak Project Management. Sejak department
    // scoping, construction tidak lagi menulis ke dua tabel milik PMO.
    public function test_construction_cannot_write_boq(): void
    {
        $con = $this->token('construction');
        $this->postJson('/api/daily-progress', [
            'prog_date' => '2026-10-12', 'scope' => 'A1.1. Carbon Steel Piping',
            'qty' => 7, 'team' => 'construction',
        ], ['Authorization' => "Bearer $con"])->assertForbidden();
        $this->putJson('/api/scopes/1', ['cumulative_qty' => 7],
            ['Authorization' => "Bearer $con"])->assertForbidden();
    }

    public function test_project_manager_writes_progress(): void
    {
        $pm = $this->token('project_manager');
        $this->postJson('/api/daily-progress', [
            'prog_date' => '2026-10-12', 'scope' => 'A1.1. Carbon Steel Piping',
            'qty' => 7, 'team' => 'project_manager',
        ], ['Authorization' => "Bearer $pm"])->assertCreated();
        $this->putJson('/api/scopes/1', ['cumulative_qty' => 7],
            ['Authorization' => "Bearer $pm"])->assertOk();
        $cum = $this->getJson('/api/scopes/1', ['Authorization' => "Bearer $pm"])->assertOk()->json('cumulative_qty');
        $this->assertEquals(7, $cum);
        \App\Models\DailyProgress::where('scope', 'A1.1. Carbon Steel Piping')->where('qty', 7)->delete();
        \App\Models\Scope::where('id', 1)->update(['cumulative_qty' => 0]);
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
            ->assertOk()->assertJsonCount(\App\Models\Joint::count());
        $this->getJson('/api/admin/departments', ['Authorization' => "Bearer $sa"])
            ->assertOk()->assertJsonCount(\App\Models\Department::count());
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
}
