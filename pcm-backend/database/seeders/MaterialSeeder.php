<?php

namespace Database\Seeders;

use App\Models\BillOfMaterial;
use App\Models\Department;
use App\Models\Drawing;
use App\Models\MaterialInspection;
use App\Models\MaterialIssuing;
use App\Models\MaterialReceiving;
use App\Models\MaterialStandard;
use App\Models\MaterialStoring;
use App\Models\Project;
use App\Models\User;
use App\Services\MaterialFlowService;
use Illuminate\Database\Seeder;

/**
 * Demo material flow. This seeder is intentionally not called by
 * DatabaseSeeder; run it manually when a demo dataset is needed.
 *
 * Data is created through MaterialFlowService so receiving, inspection,
 * stock, and issuing stay consistent with the operational ledger.
 */
class MaterialSeeder extends Seeder
{
    public function run(): void
    {
        $materialUser = User::query()->where('role', 'material')->first();
        $qcUser = User::query()->where('role', 'qaqc')->first();

        if (! $materialUser || ! $qcUser) {
            if ($this->command) {
                $this->command->warn('MaterialSeeder dilewati: user material/qaqc belum tersedia.');
            }

            return;
        }

        $departmentId = Department::query()->where('code', 'MAT')->value('id');
        $engineeringDepartmentId = Department::query()->where('code', 'ENG')->value('id') ?? $departmentId;
        $projectId = Project::query()->value('id');
        $flow = app(MaterialFlowService::class);

        // Katalog minimal supaya seeder bisa dijalankan tanpa EngineeringSeeder.
        // Kode yang sama tidak diduplikasi jika EngineeringSeeder sudah jalan.
        $standardCatalog = [
            ['code' => 'CS-PIPE-A106B', 'category' => 'Pipe', 'specification' => 'ASTM A106 Gr. B Seamless', 'material_group' => 'Carbon Steel'],
            ['code' => 'SS-PIPE-A312-304', 'category' => 'Pipe', 'specification' => 'ASTM A312 TP304 / TP316L', 'material_group' => 'Stainless Steel'],
            ['code' => 'CS-FIT-A234WPB', 'category' => 'Fitting', 'specification' => 'ASTM A234 WPB Wrought Carbon', 'material_group' => 'Carbon Steel'],
            ['code' => 'CS-FLG-A105', 'category' => 'Flange', 'specification' => 'ASTM A105 Forged Carbon', 'material_group' => 'Carbon Steel'],
            ['code' => 'VLV-GATE-WCB', 'category' => 'Valve', 'specification' => 'API 600 Cast Steel WCB Trim 8', 'material_group' => 'Carbon Steel'],
            ['code' => 'FST-A193-B7', 'category' => 'Fastener', 'specification' => 'ASTM A193 B7 / A194 2H', 'material_group' => 'Alloy Steel'],
            ['code' => 'GSK-SW-SS316', 'category' => 'Gasket', 'specification' => 'Spiral Wound SS316L / Graphite', 'material_group' => 'Stainless Steel'],
        ];

        foreach ($standardCatalog as $standard) {
            MaterialStandard::firstOrCreate(
                ['code' => $standard['code']],
                array_merge($standard, ['department_id' => $engineeringDepartmentId])
            );
        }

        $standardIds = MaterialStandard::query()
            ->whereIn('code', array_column($standardCatalog, 'code'))
            ->pluck('id', 'code');

        $receivings = [
            [
                'arrival_date' => '2026-10-05',
                'shipment_no' => 'SJ-SPN-8842',
                'material_standard_code' => 'CS-PIPE-A106B',
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-2428-MAT-001',
                'vendor' => 'PT Seamless Pipe Nusantara',
                'item_name' => 'Pipe Seamless Carbon Steel',
                'category' => 'PIPE',
                'description' => 'Pipe Seamless BE ASTM A106 Gr. B 4" Sch 40',
                'specification' => 'ASTM A106 Gr. B',
                'size' => '4"',
                'schedule_rating' => 'Sch 40',
                'heat_no' => 'HT-99421A',
                'mtc_no' => 'MTC-SPN-2026-101',
                'qty' => 120.00,
                'unit' => 'meter',
                'packing_type' => 'Bundle',
                'storage_type' => 'OPEN_YARD',
                'storage_location' => 'Laydown Yard Bay 01',
                'remarks' => 'Material tiba lengkap dengan cap sertifikat pabrik & bevel protector utuh.',
            ],
            [
                'arrival_date' => '2026-10-06',
                'shipment_no' => 'SJ-SPN-8849',
                'material_standard_code' => 'SS-PIPE-A312-304',
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-2428-MAT-001',
                'vendor' => 'PT Seamless Pipe Nusantara',
                'item_name' => 'Pipe Seamless Stainless Steel',
                'category' => 'PIPE',
                'description' => 'Pipe Seamless Plain End ASTM A312 TP304 2" Sch 80',
                'specification' => 'ASTM A312 TP304',
                'size' => '2"',
                'schedule_rating' => 'Sch 80',
                'heat_no' => 'HT-77218B',
                'mtc_no' => 'MTC-SPN-2026-108',
                'qty' => 60.00,
                'unit' => 'meter',
                'packing_type' => 'Bundle',
                'storage_type' => 'OPEN_YARD',
                'storage_location' => 'Laydown Yard Bay 02',
                'remarks' => 'Disimpan di atas dunnage kayu bertutup terpal anti kontaminasi.',
            ],
            [
                'arrival_date' => '2026-10-08',
                'shipment_no' => 'SJ-VFP-1092',
                'material_standard_code' => 'CS-FIT-A234WPB',
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-2428-MAT-002',
                'vendor' => 'PT Valve & Fitting Perkasa',
                'item_name' => '90 Deg Elbow BW',
                'category' => 'FITTING',
                'description' => '90 Deg LR Elbow BW ASTM A234 WPB 4" Sch 40',
                'specification' => 'ASTM A234 WPB',
                'size' => '4"',
                'schedule_rating' => 'Sch 40',
                'heat_no' => 'HT-55102C',
                'mtc_no' => 'MTC-VFP-2026-55',
                'qty' => 24.00,
                'unit' => 'pcs',
                'packing_type' => 'Crate',
                'storage_type' => 'WAREHOUSE',
                'storage_location' => 'Warehouse Rack A-02',
                'remarks' => 'Pemeriksaan visual bevel & ketebalan dinding sesuai toleransi ASME B16.9.',
            ],
            [
                'arrival_date' => '2026-10-08',
                'shipment_no' => 'SJ-VFP-1094',
                'material_standard_code' => 'CS-FLG-A105',
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-2428-MAT-002',
                'vendor' => 'PT Valve & Fitting Perkasa',
                'item_name' => 'Flange WNRF 150#',
                'category' => 'FLANGE',
                'description' => 'Weld Neck Raised Face Flange ASTM A105 4" Class 150',
                'specification' => 'ASTM A105',
                'size' => '4"',
                'schedule_rating' => '150# RF',
                'heat_no' => 'HT-44190D',
                'mtc_no' => 'MTC-VFP-2026-58',
                'qty' => 16.00,
                'unit' => 'pcs',
                'packing_type' => 'Crate',
                'storage_type' => 'WAREHOUSE',
                'storage_location' => 'Warehouse Rack B-01',
                'remarks' => 'Serrated spiral finish pada flange face kondisi prima tanpa goresan.',
            ],
            [
                'arrival_date' => '2026-10-10',
                'shipment_no' => 'SJ-VFP-1105',
                'material_standard_code' => 'VLV-GATE-WCB',
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-2428-MAT-002',
                'vendor' => 'PT Valve & Fitting Perkasa',
                'item_name' => 'Gate Valve 150# RF',
                'category' => 'VALVE',
                'description' => 'Gate Valve OS&Y Rising Stem Body ASTM A216 WCB Trim 8 4" 150#',
                'specification' => 'ASTM A216 WCB',
                'size' => '4"',
                'schedule_rating' => '150# RF',
                'heat_no' => 'HT-88201E',
                'mtc_no' => 'MTC-VFP-2026-72',
                'qty' => 6.00,
                'unit' => 'pcs',
                'packing_type' => 'Crate',
                'storage_type' => 'WAREHOUSE',
                'storage_location' => 'Warehouse Valve Bay C-01',
                'remarks' => 'End flange cover terpasang, handwheel dan stem berpelumas baik.',
            ],
            [
                'arrival_date' => '2026-10-11',
                'shipment_no' => 'SJ-SI-5521',
                'material_standard_code' => 'FST-A193-B7',
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-2428-MAT-003',
                'vendor' => 'PT Steel Indotech',
                'item_name' => 'Stud Bolts & Nuts',
                'category' => 'FASTENER',
                'description' => 'Stud Bolt with 2 Heavy Hex Nuts ASTM A193 B7 / A194 2H 5/8" x 90mm',
                'specification' => 'ASTM A193 B7 / A194 2H',
                'size' => '5/8" x 90mm',
                'schedule_rating' => 'UNC Heavy',
                'heat_no' => 'HT-11920F',
                'mtc_no' => 'MTC-SI-2026-310',
                'qty' => 128.00,
                'unit' => 'set',
                'packing_type' => 'Box',
                'storage_type' => 'WAREHOUSE',
                'storage_location' => 'Warehouse Bin Fastener D-03',
                'remarks' => 'Pelapisan anti karat hitam (black phosphate) bersih & rapi.',
            ],
            [
                'arrival_date' => '2026-10-11',
                'shipment_no' => 'SJ-SI-5525',
                'material_standard_code' => 'GSK-SW-SS316',
                'line_no' => '15-MPP-AB',
                'po_no' => 'PO-2428-MAT-003',
                'vendor' => 'PT Steel Indotech',
                'item_name' => 'Spiral Wound Gasket',
                'category' => 'GASKET',
                'description' => 'Spiral Wound Gasket SS316 with Graphite Filler & Inner Ring 4" 150#',
                'specification' => 'ASME B16.20 SS316',
                'size' => '4"',
                'schedule_rating' => '150#',
                'heat_no' => 'HT-33019G',
                'mtc_no' => 'MTC-SI-2026-315',
                'qty' => 32.00,
                'unit' => 'pcs',
                'packing_type' => 'Box',
                'storage_type' => 'WAREHOUSE',
                'storage_location' => 'Warehouse Shelf Gasket E-01',
                'remarks' => 'Tersimpan rata tanpa beban tumpuk berlebih untuk menjaga kerapatan spiral.',
            ],
        ];

        $created = [];

        foreach ($receivings as $data) {
            $standardCode = $data['material_standard_code'] ?? null;
            unset($data['material_standard_code']);

            $receiving = MaterialReceiving::updateOrCreate(
                [
                    'shipment_no' => $data['shipment_no'],
                    'heat_no' => $data['heat_no'],
                ],
                array_merge($data, [
                    'project_id' => $projectId,
                    'department_id' => $departmentId,
                    'material_standard_id' => $standardCode ? ($standardIds[$standardCode] ?? null) : null,
                ])
            );

            if ($receiving->status !== 'ACCEPTED') {
                $flow->requestInspection($receiving, $materialUser);
            }

            $created[$data['shipment_no'].'|'.$data['heat_no']] = $receiving;
        }

        $inspections = [
            [
                'receiving_key' => 'SJ-SPN-8842|HT-99421A',
                'report_no' => 'MIR-2428-001',
                'inspection_date' => '2026-10-06',
                'inspector_name' => 'Budi Santoso (QC Inspector)',
                'item_name' => 'Pipe Seamless Carbon Steel 4" Sch 40',
                'heat_no' => 'HT-99421A',
                'visual_check' => 'PASS',
                'dimension_check' => 'PASS',
                'mtc_check' => 'PASS',
                'result' => 'ACCEPTED',
                'notes' => 'Tebal dinding 6.02 mm (nominal 6.02 mm). Hardness & tensile test MTC lolos spek ASTM A106.',
            ],
            [
                'receiving_key' => 'SJ-SPN-8849|HT-77218B',
                'report_no' => 'MIR-2428-002',
                'inspection_date' => '2026-10-07',
                'inspector_name' => 'Budi Santoso (QC Inspector)',
                'item_name' => 'Pipe Seamless SS304 2" Sch 80',
                'heat_no' => 'HT-77218B',
                'visual_check' => 'PASS',
                'dimension_check' => 'PASS',
                'mtc_check' => 'PASS',
                'result' => 'ACCEPTED',
                'notes' => 'PMI test konfirmasi komposisi Cr 18.2%, Ni 8.1%. Permukaan mulus tanpa goresan.',
            ],
            [
                'receiving_key' => 'SJ-VFP-1092|HT-55102C',
                'report_no' => 'MIR-2428-003',
                'inspection_date' => '2026-10-09',
                'inspector_name' => 'Rahmat Hidayat (QC Inspector)',
                'item_name' => '90 Deg LR Elbow BW 4" Sch 40',
                'heat_no' => 'HT-55102C',
                'visual_check' => 'PASS',
                'dimension_check' => 'PASS',
                'mtc_check' => 'PASS',
                'result' => 'ACCEPTED',
                'notes' => 'Sudut lengkung 90° tepat, ovalitas di bawah batas maksimum 1.5%.',
            ],
            [
                'receiving_key' => 'SJ-VFP-1094|HT-44190D',
                'report_no' => 'MIR-2428-004',
                'inspection_date' => '2026-10-09',
                'inspector_name' => 'Rahmat Hidayat (QC Inspector)',
                'item_name' => 'Flange WNRF ASTM A105 4" 150#',
                'heat_no' => 'HT-44190D',
                'visual_check' => 'PASS',
                'dimension_check' => 'PASS',
                'mtc_check' => 'PASS',
                'result' => 'ACCEPTED',
                'notes' => 'Pitch diameter bolt hole & raised face height 1.6mm sesuai standar ASME B16.5.',
            ],
            [
                'receiving_key' => 'SJ-VFP-1105|HT-88201E',
                'report_no' => 'MIR-2428-005',
                'inspection_date' => '2026-10-11',
                'inspector_name' => 'Budi Santoso (QC Inspector)',
                'item_name' => 'Gate Valve OS&Y A216 WCB 4" 150#',
                'heat_no' => 'HT-88201E',
                'visual_check' => 'PASS',
                'dimension_check' => 'PASS',
                'mtc_check' => 'PASS',
                'result' => 'ACCEPTED',
                'notes' => 'Seat tightness hydrostatic test certificate terlampir dari pabrik pembuat.',
            ],
            [
                'receiving_key' => 'SJ-SI-5521|HT-11920F',
                'report_no' => 'MIR-2428-006',
                'inspection_date' => '2026-10-12',
                'inspector_name' => 'Rahmat Hidayat (QC Inspector)',
                'item_name' => 'Stud Bolt with 2 Nuts 5/8" x 90mm',
                'heat_no' => 'HT-11920F',
                'visual_check' => 'PASS',
                'dimension_check' => 'PASS',
                'mtc_check' => 'PASS',
                'result' => 'ACCEPTED',
                'notes' => 'Thread engagement dan coating phosphate sesuai sertifikat MTC.',
            ],
            [
                'receiving_key' => 'SJ-SI-5525|HT-33019G',
                'report_no' => 'MIR-2428-007',
                'inspection_date' => '2026-10-12',
                'inspector_name' => 'Budi Santoso (QC Inspector)',
                'item_name' => 'Spiral Wound Gasket 4" 150# RF',
                'heat_no' => 'HT-33019G',
                'visual_check' => 'PASS',
                'dimension_check' => 'PASS',
                'mtc_check' => 'PASS',
                'result' => 'ACCEPTED',
                'notes' => 'Inner ring dan winding SS316/graphite utuh, tidak ada deformasi.',
            ],
        ];

        foreach ($inspections as $data) {
            $receiving = $created[$data['receiving_key']] ?? null;

            if (! $receiving) {
                continue;
            }

            unset($data['receiving_key']);

            $inspection = MaterialInspection::updateOrCreate(
                ['report_no' => $data['report_no']],
                array_merge($data, [
                    'material_receiving_id' => $receiving->id,
                    'project_id' => $projectId,
                    'department_id' => $departmentId,
                    'accepted_qty' => $receiving->qty,
                ])
            );

            $flow->applyInspection($inspection, $qcUser);
        }

        $issuings = [
            [
                'issue_date' => '2026-10-12',
                'issue_no' => 'MIS-2428-001',
                'heat_no' => 'HT-99421A',
                'requestor' => 'Workshop Spool Fab - Team A (Foreman Sukardi)',
                'target_spool_no' => 'SP-01',
                'target_line_no' => '15-MPP-AB',
                'drawing_no' => '2428-M-15-MPP-AB-SHT1',
                'qty' => 6.20,
                'unit' => 'meter',
                'issued_by' => 'Material Control (Agus W.)',
                'remarks' => 'Dikeluarkan untuk pemotongan pipa & beveling spool SP-01 Joint W-001 & W-002.',
            ],
            [
                'issue_date' => '2026-10-12',
                'issue_no' => 'MIS-2428-002',
                'heat_no' => 'HT-55102C',
                'requestor' => 'Workshop Spool Fab - Team A (Foreman Sukardi)',
                'target_spool_no' => 'SP-01',
                'target_line_no' => '15-MPP-AB',
                'drawing_no' => '2428-M-15-MPP-AB-SHT1',
                'qty' => 2.00,
                'unit' => 'pcs',
                'issued_by' => 'Material Control (Agus W.)',
                'remarks' => 'Fit-up fitting elbow untuk spool SP-01 joint W-002 & W-003.',
            ],
            [
                'issue_date' => '2026-10-13',
                'issue_no' => 'MIS-2428-003',
                'heat_no' => 'HT-44190D',
                'requestor' => 'Workshop Spool Fab - Team A (Foreman Sukardi)',
                'target_spool_no' => 'SP-01',
                'target_line_no' => '15-MPP-AB',
                'drawing_no' => '2428-M-15-MPP-AB-SHT1',
                'qty' => 1.00,
                'unit' => 'pcs',
                'issued_by' => 'Material Control (Agus W.)',
                'remarks' => 'Terminasi flange spool SP-01 joint W-001 (ujung sambungan tie-in).',
            ],
            [
                'issue_date' => '2026-10-14',
                'issue_no' => 'MIS-2428-004',
                'heat_no' => 'HT-99421A',
                'requestor' => 'Workshop Spool Fab - Team B (Foreman Hendra)',
                'target_spool_no' => 'SP-02',
                'target_line_no' => '15-MPP-AB',
                'drawing_no' => '2428-M-15-MPP-AB-SHT1',
                'qty' => 8.40,
                'unit' => 'meter',
                'issued_by' => 'Material Control (Agus W.)',
                'remarks' => 'Pemotongan & persiapan perakitan spool SP-02 joint W-005, W-006, W-007.',
            ],
        ];

        foreach ($issuings as $data) {
            if (MaterialIssuing::query()->where('issue_no', $data['issue_no'])->exists()) {
                continue;
            }

            $stock = MaterialStoring::query()
                ->where('heat_no', $data['heat_no'])
                ->where('status', '!=', 'VOID')
                ->first();

            if (! $stock) {
                continue;
            }

            $drawingId = Drawing::query()
                ->where('drawing_no', $data['drawing_no'])
                ->value('id');

            $bomQuery = BillOfMaterial::query()
                ->where('drawing_id', $drawingId)
                ->where('spool_no', $data['target_spool_no']);

            if ($stock->material_standard_id) {
                $bomQuery->where('material_standard_id', $stock->material_standard_id);
            }

            $bom = $bomQuery->orderBy('item_no')->first();

            unset($data['heat_no']);

            $data['drawing_id'] = $drawingId;
            $data['bom_id'] = $bom?->id;
            $data['material_storing_id'] = $stock->id;
            $data['material_standard_id'] = $stock->material_standard_id;
            $data['project_id'] = $projectId;
            $data['department_id'] = $departmentId;

            $flow->createIssuing($data, $materialUser);
        }
    }
}
