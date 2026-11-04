<?php

namespace Database\Seeders;

use App\Models\BillOfMaterial;
use App\Models\Department;
use App\Models\DocumentControl;
use App\Models\Drawing;
use App\Models\EngineeringBoq;
use App\Models\LineService;
use App\Models\MaterialStandard;
use App\Models\Project;
use App\Models\WeldingMap;
use Illuminate\Database\Seeder;

class EngineeringSeeder extends Seeder
{
    public function run(): void
    {
        $engDept = Department::where('code', 'ENG')->first();
        $deptId = $engDept ? $engDept->id : null;
        $proj = Project::first();
        $projId = $proj ? $proj->id : null;
        $drawing = Drawing::where('drawing_no', 'like', '%2428-M-15-MPP-AB%')->first() ?: Drawing::first();

        if (! $drawing) {
            $drawing = Drawing::updateOrCreate(
                ['drawing_no' => '2428-M-15-MPP-AB-SHT1'],
                [
                    'project_id' => $projId,
                    'line_no' => '15-MPP-AB',
                    'area' => 'MPP',
                    'rev' => '0',
                    'status' => 'IFC',
                    'department_id' => $deptId,
                ]
            );
        }

        $drawingId = $drawing->id;

        // 1. Line Service
        LineService::firstOrCreate(
            ['line_no' => '15-MPP-AB'],
            [
                'project_id' => $projId,
                'service_name' => 'Main Process Piping (MPP)',
                'fluid_code' => 'MPP',
                'piping_class' => 'A1A (Carbon Steel 150#)',
                'design_press' => '10.5 bar',
                'design_temp' => '120 °C',
                'operating_press' => '8.0 bar',
                'operating_temp' => '90 °C',
                'test_press' => '15.8 bar',
                'test_medium' => 'Hydrostatic (Clean Water)',
                'insulation' => 'None',
                'department_id' => $deptId,
            ]
        );

        LineService::firstOrCreate(
            ['line_no' => '20-FG-01'],
            [
                'project_id' => $projId,
                'service_name' => 'Fuel Gas Supply',
                'fluid_code' => 'FG',
                'piping_class' => 'A2A (Carbon Steel 300#)',
                'design_press' => '19.6 bar',
                'design_temp' => '65 °C',
                'operating_press' => '14.0 bar',
                'operating_temp' => '40 °C',
                'test_press' => '29.4 bar',
                'test_medium' => 'Pneumatic (Nitrogen)',
                'insulation' => 'None',
                'department_id' => $deptId,
            ]
        );

        LineService::firstOrCreate(
            ['line_no' => '08-CW-02'],
            [
                'project_id' => $projId,
                'service_name' => 'Cooling Water Return',
                'fluid_code' => 'CW',
                'piping_class' => 'A1A (Carbon Steel 150#)',
                'design_press' => '6.0 bar',
                'design_temp' => '50 °C',
                'operating_press' => '4.2 bar',
                'operating_temp' => '38 °C',
                'test_press' => '9.0 bar',
                'test_medium' => 'Hydrostatic (Water)',
                'insulation' => 'None',
                'department_id' => $deptId,
            ]
        );

        // 2. Material Standards
        $standards = [
            [
                'code' => 'CS-PIPE-A106B',
                'category' => 'Pipe',
                'specification' => 'ASTM A106 Gr. B Seamless',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Pipa seamless karbon untuk temperatur dan tekanan menengah.',
            ],
            [
                'code' => 'CS-FIT-A234WPB',
                'category' => 'Fitting',
                'specification' => 'ASTM A234 WPB Wrought Carbon',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Fitting las tumpul (Elbow 90 LR, Tee, Reducer).',
            ],
            [
                'code' => 'CS-FLG-A105',
                'category' => 'Flange',
                'specification' => 'ASTM A105 Forged Carbon',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'Sch 40 RF',
                'size_range' => '1/2" - 24"',
                'description' => 'Flange jenis Weld Neck (WN) dan Slip-On (SO).',
            ],
            [
                'code' => 'SS-PIPE-A312-304',
                'category' => 'Pipe',
                'specification' => 'ASTM A312 TP304 / TP316L',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Pipa baja tahan karat untuk fluida korosif.',
            ],
            [
                'code' => 'ALLOY-PIPE-P11',
                'category' => 'Pipe',
                'specification' => 'ASTM A335 Gr. P11 Low Alloy',
                'material_group' => 'Alloy Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 80 / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Pipa alloy untuk temperatur uap panas tinggi.',
            ],
            [
                'code' => 'VLV-GATE-WCB',
                'category' => 'Valve',
                'specification' => 'API 600 Cast Steel WCB Trim 8',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'Class 150# Flanged RF',
                'schedule' => 'N/A',
                'size_range' => '2" - 12"',
                'description' => 'Katup isolasi utama OS&Y Gate Valve.',
            ],
            [
                'code' => 'GSK-SW-SS316',
                'category' => 'Gasket',
                'specification' => 'Spiral Wound SS316L / Graphite',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'Class 150# / 300# RF',
                'schedule' => 'N/A',
                'size_range' => '1/2" - 24"',
                'description' => 'Gasket spiral wound untuk sambungan flange.',
            ],
            [
                'code' => 'FST-A193-B7',
                'category' => 'Fastener',
                'specification' => 'ASTM A193 B7 / A194 2H',
                'material_group' => 'Alloy Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '5/8" - 1-1/2"',
                'description' => 'Stud bolt dan heavy hex nut untuk flange.',
            ],
        ];

        foreach ($standards as $std) {
            MaterialStandard::firstOrCreate(
                ['code' => $std['code']],
                array_merge($std, ['department_id' => $deptId])
            );
        }

        $standardIds = MaterialStandard::query()->pluck('id', 'code');

        // 3. Welding Map (28 joint dari drawing 2428-M-15-MPP-AB-SHT1)
        if (WeldingMap::count() === 0) {
            for ($j = 1; $j <= 28; $j++) {
                $jointNo = sprintf('W-%03d', $j);
                $spoolNo = 'SP-'.sprintf('%02d', ceil($j / 7));
                $isField = ($j >= 25); // 25..28 field joints, sisanya shop joints
                $location = $isField ? 'Field' : 'Shop';

                WeldingMap::create([
                    'project_id' => $projId,
                    'drawing_id' => $drawingId,
                    'line_no' => '15-MPP-AB',
                    'iso_drawing_no' => '2428-M-15-MPP-AB-SHT1',
                    'sheet' => 'Sheet 1 of 1',
                    'spool_no' => $spoolNo,
                    'joint_no' => $jointNo,
                    'joint_type' => 'BW',
                    'size' => '4"',
                    'dia_inch' => 4.00,
                    'thickness' => 'Sch 40 (6.02 mm)',
                    'length_mm' => 1200,
                    'location' => $location,
                    'wps_no' => 'WPS-PCM-01-GTAW/SMAW',
                    'mat_a_item' => 'Pipe',
                    'mat_a_spec' => 'ASTM A106 Gr. B',
                    'mat_a_size' => '4"',
                    'mat_a_sch' => 'Sch 40',
                    'mat_b_item' => ($j % 2 === 0) ? 'Elbow 90 LR' : 'Pipe',
                    'mat_b_spec' => ($j % 2 === 0) ? 'ASTM A234 WPB' : 'ASTM A106 Gr. B',
                    'mat_b_size' => '4"',
                    'mat_b_sch' => 'Sch 40',
                    'status' => 'PLANNED',
                    'department_id' => $deptId,
                ]);
            }
        }

        // 4. Bill of Material (BOM/MTO)
        $this->call(PipingClassTemplateSeeder::class);

        if (BillOfMaterial::count() === 0) {
            $bomItems = [
                ['spool_no' => 'SP-01', 'item_no' => '1', 'component_type' => 'Pipe', 'description' => 'Pipe Seamless BE ASTM A106 Gr. B', 'size' => '4"', 'rating_sch' => 'Sch 40', 'material_spec' => 'ASTM A106 Gr. B', 'material_standard_code' => 'CS-PIPE-A106B', 'qty' => 6.20, 'unit' => 'meter', 'tag_number' => 'P-01'],
                ['spool_no' => 'SP-01', 'item_no' => '2', 'component_type' => 'Elbow 90 LR', 'description' => 'Elbow 90 Deg Long Radius BW ASTM A234 WPB', 'size' => '4"', 'rating_sch' => 'Sch 40', 'material_spec' => 'ASTM A234 WPB', 'material_standard_code' => 'CS-FIT-A234WPB', 'qty' => 2, 'unit' => 'buah', 'tag_number' => 'EL-01'],
                ['spool_no' => 'SP-01', 'item_no' => '3', 'component_type' => 'Flange WN', 'description' => 'Flange Weld Neck RF Class 150# ASTM A105', 'size' => '4"', 'rating_sch' => '150# Sch 40', 'material_spec' => 'ASTM A105', 'material_standard_code' => 'CS-FLG-A105', 'qty' => 1, 'unit' => 'buah', 'tag_number' => 'FL-01'],
                ['spool_no' => 'SP-02', 'item_no' => '4', 'component_type' => 'Pipe', 'description' => 'Pipe Seamless BE ASTM A106 Gr. B', 'size' => '4"', 'rating_sch' => 'Sch 40', 'material_spec' => 'ASTM A106 Gr. B', 'material_standard_code' => 'CS-PIPE-A106B', 'qty' => 8.40, 'unit' => 'meter', 'tag_number' => 'P-02'],
                ['spool_no' => 'SP-02', 'item_no' => '5', 'component_type' => 'Tee Straight', 'description' => 'Tee Straight Equal BW ASTM A234 WPB', 'size' => '4"', 'rating_sch' => 'Sch 40', 'material_spec' => 'ASTM A234 WPB', 'material_standard_code' => 'CS-FIT-A234WPB', 'qty' => 1, 'unit' => 'buah', 'tag_number' => 'T-01'],
                ['spool_no' => 'SP-03', 'item_no' => '6', 'component_type' => 'Gate Valve', 'description' => 'Gate Valve 150# Flanged RF Cast Steel WCB Trim 8', 'size' => '4"', 'rating_sch' => '150#', 'material_spec' => 'ASTM A216 WCB', 'material_standard_code' => 'VLV-GATE-WCB', 'qty' => 1, 'unit' => 'buah', 'tag_number' => 'V-101'],
                ['spool_no' => 'SP-03', 'item_no' => '7', 'component_type' => 'Gasket', 'description' => 'Spiral Wound Gasket SS316L/Graphite CS Outer 150#', 'size' => '4"', 'rating_sch' => '150#', 'material_spec' => 'SS316L / Graphite', 'material_standard_code' => 'GSK-SW-SS316', 'qty' => 2, 'unit' => 'buah', 'tag_number' => 'G-01'],
                ['spool_no' => 'SP-03', 'item_no' => '8', 'component_type' => 'Stud Bolt', 'description' => 'Stud Bolt with 2 Heavy Hex Nuts 5/8" x 90mm', 'size' => '5/8"', 'rating_sch' => 'L=90mm', 'material_spec' => 'ASTM A193 B7 / A194 2H', 'material_standard_code' => 'FST-A193-B7', 'qty' => 16, 'unit' => 'set', 'tag_number' => 'B-01'],
            ];

            foreach ($bomItems as $item) {
                $standardCode = $item['material_standard_code'] ?? null;
                unset($item['material_standard_code']);

                BillOfMaterial::create(array_merge($item, [
                    'project_id' => $projId,
                    'drawing_id' => $drawingId,
                    'material_standard_id' => $standardCode ? ($standardIds[$standardCode] ?? null) : null,
                    'department_id' => $deptId,
                ]));
            }
        }

        // 5. Engineering BOQ
        if (EngineeringBoq::count() === 0) {
            $boqItems = [
                [
                    'project_id' => $projId,
                    'drawing_id' => $drawingId,
                    'line_no' => '15-MPP-AB',
                    'item_code' => 'BOQ-ENG-FAB-01',
                    'work_scope' => 'Workshop Spool Fabrication Carbon Steel',
                    'material_group' => 'Carbon Steel',
                    'dia_inch_total' => 96.00,
                    'joints_count' => 24,
                    'spools_count' => 4,
                    'weight_kg' => 850.00,
                    'status' => 'APPROVED',
                    'department_id' => $deptId,
                ],
                [
                    'project_id' => $projId,
                    'drawing_id' => $drawingId,
                    'line_no' => '15-MPP-AB',
                    'item_code' => 'BOQ-ENG-ERE-01',
                    'work_scope' => 'Field Installation & Erection Carbon Steel',
                    'material_group' => 'Carbon Steel',
                    'dia_inch_total' => 16.00,
                    'joints_count' => 4,
                    'spools_count' => 4,
                    'weight_kg' => 850.00,
                    'status' => 'APPROVED',
                    'department_id' => $deptId,
                ],
                [
                    'project_id' => $projId,
                    'drawing_id' => $drawingId,
                    'line_no' => '15-MPP-AB',
                    'item_code' => 'BOQ-ENG-SPT-01',
                    'work_scope' => 'Pipe Support Fabrication & Installation',
                    'material_group' => 'Structural Steel',
                    'dia_inch_total' => 0.00,
                    'joints_count' => 8,
                    'spools_count' => 0,
                    'weight_kg' => 240.00,
                    'status' => 'ESTIMATED',
                    'department_id' => $deptId,
                ],
            ];

            foreach ($boqItems as $b) {
                EngineeringBoq::create($b);
            }
        }

        // 6. Document Control
        if (DocumentControl::count() === 0) {
            $docs = [
                [
                    'project_id' => $projId,
                    'drawing_id' => $drawingId,
                    'document_no' => 'DOC-2428-ISO-001',
                    'drawing_no' => '2428-M-15-MPP-AB-SHT1',
                    'title' => 'Main Process Piping Line 15-MPP-AB Sheet 1',
                    'rev_no' => '0',
                    'status_doc' => 'IFC',
                    'incoming_date' => '2026-10-01',
                    'issued_date' => '2026-10-05',
                    'distributed_to' => 'Workshop Spool Fabrication',
                    'receiver_name' => 'Bpk. Sutrisno (QC Lead)',
                    'transmittal_no' => 'TRANS-2428-ENG-001',
                    'file_path' => 'drawings/2428-M-15-MPP-AB-SHT1_rev0.pdf',
                    'remarks' => 'Issued for Construction resmi untuk fabrikasi spool shop.',
                    'department_id' => $deptId,
                ],
                [
                    'project_id' => $projId,
                    'drawing_id' => $drawingId,
                    'document_no' => 'DOC-2428-ISO-002',
                    'drawing_no' => '2428-M-20-FG-01-SHT1',
                    'title' => 'Fuel Gas Piping Line 20-FG-01 Sheet 1',
                    'rev_no' => 'A',
                    'status_doc' => 'IFA',
                    'incoming_date' => '2026-10-08',
                    'issued_date' => '2026-10-10',
                    'distributed_to' => 'Project Manager (PMO)',
                    'receiver_name' => 'Project Manager',
                    'transmittal_no' => 'TRANS-2428-ENG-002',
                    'file_path' => null,
                    'remarks' => 'Issued for Approval klien dan Project Manager.',
                    'department_id' => $deptId,
                ],
            ];

            foreach ($docs as $d) {
                DocumentControl::create($d);
            }
        }
    }
}
