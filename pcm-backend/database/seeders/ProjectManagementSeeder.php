<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Project;
use App\Models\Department;
use App\Models\ProjectMilestone;
use App\Models\BudgetItem;

class ProjectManagementSeeder extends Seeder
{
    public function run(): void
    {
        $pmoDept = Department::where('code', 'PMO')->first();
        $deptId = $pmoDept ? $pmoDept->id : null;
        $proj = Project::first();
        $projId = $proj ? $proj->id : null;

        // 1. Project Milestones (Hold points & Key Stages based on Flowchart)
        $milestones = [
            [
                'code' => 'M-01',
                'name' => 'Kick-off & Master Schedule Baseline Approval',
                'phase' => 'Initiation',
                'target_date' => '2026-10-01',
                'actual_date' => '2026-10-01',
                'weight_pct' => 5.00,
                'status' => 'COMPLETED',
                'is_hold_point' => false,
                'pic_lead' => 'Project Manager',
                'remarks' => 'Kick-off meeting dengan Client, pengesahan baseline kontrak 18 scopes.',
            ],
            [
                'code' => 'M-02',
                'name' => 'Isometric Drawing & Weld Map 100% IFC Release',
                'phase' => 'Engineering',
                'target_date' => '2026-10-10',
                'actual_date' => '2026-10-09',
                'weight_pct' => 15.00,
                'status' => 'COMPLETED',
                'is_hold_point' => true,
                'pic_lead' => 'Lead Piping Engineer',
                'remarks' => 'Hold Point 1: Seluruh gambar isometrik dan WPS siap konstruksi dirilis.',
            ],
            [
                'code' => 'M-03',
                'name' => 'Material Receiving & MTC 100% Verification',
                'phase' => 'Procurement',
                'target_date' => '2026-10-15',
                'actual_date' => '2026-10-14',
                'weight_pct' => 15.00,
                'status' => 'COMPLETED',
                'is_hold_point' => true,
                'pic_lead' => 'Material Control Lead',
                'remarks' => 'Hold Point 2: Verifikasi heat number pipa, fitting, valve lolos inspeksi QC.',
            ],
            [
                'code' => 'M-04',
                'name' => 'Workshop Spool Fabrication Complete (52,454 DI)',
                'phase' => 'Fabrication',
                'target_date' => '2026-11-20',
                'actual_date' => null,
                'weight_pct' => 25.00,
                'status' => 'IN_PROGRESS',
                'is_hold_point' => false,
                'pic_lead' => 'Shop Superintendent',
                'remarks' => 'Penyelesaian seluruh spool pipa CS, SS, dan Alloy di workshop.',
            ],
            [
                'code' => 'M-05',
                'name' => 'Field Erection & NDT Clearance (98,753 DI)',
                'phase' => 'Erection',
                'target_date' => '2026-12-15',
                'actual_date' => null,
                'weight_pct' => 25.00,
                'status' => 'PENDING',
                'is_hold_point' => true,
                'pic_lead' => 'Construction Manager',
                'remarks' => 'Hold Point 3: Pemasangan spool lapangan & persetujuan hasil NDT 100%.',
            ],
            [
                'code' => 'M-06',
                'name' => 'Hydrostatic Pressure Test & System Reinstatement',
                'phase' => 'Testing',
                'target_date' => '2026-12-28',
                'actual_date' => null,
                'weight_pct' => 10.00,
                'status' => 'PENDING',
                'is_hold_point' => true,
                'pic_lead' => 'Test Package Lead',
                'remarks' => 'Hold Point 4: Uji tekan air, dewatering, blowing, dan pemasangan kembali katup.',
            ],
            [
                'code' => 'M-07',
                'name' => 'Final Dossier, As-Built Handover & Closing',
                'phase' => 'Closing',
                'target_date' => '2027-01-10',
                'actual_date' => null,
                'weight_pct' => 5.00,
                'status' => 'PENDING',
                'is_hold_point' => false,
                'pic_lead' => 'Project Manager',
                'remarks' => 'Penyerahan berita acara serah terima operasional ke Owner.',
            ],
        ];

        foreach ($milestones as $m) {
            ProjectMilestone::firstOrCreate(
                ['code' => $m['code']],
                array_merge($m, ['project_id' => $projId, 'department_id' => $deptId])
            );
        }

        // 2. Budget Items (from sheet Budget VS Progress & BOQ Proposal)
        $budgetItems = [
            [
                'item_code' => 'DIR-FAB-CS',
                'category' => 'Direct Cost',
                'scope_description' => 'A1.1 Carbon Steel Piping Spool Shop Fab',
                'unit' => 'DI',
                'contract_qty' => 37783.91,
                'unit_price' => 19.52,
                'labor_cost' => 377134.67,
                'equipment_cost' => 214966.76,
                'consumable_cost' => 165939.24,
                'total_budget' => 758040.67,
                'actual_cost' => 184500.00,
                'currency' => 'USD',
            ],
            [
                'item_code' => 'DIR-FAB-P11',
                'category' => 'Direct Cost',
                'scope_description' => 'A1.2 Alloy Steel Piping (P11, P22) Shop Fab',
                'unit' => 'DI',
                'contract_qty' => 3613.87,
                'unit_price' => 24.36,
                'labor_cost' => 44156.91,
                'equipment_cost' => 25169.43,
                'consumable_cost' => 19429.05,
                'total_budget' => 88755.39,
                'actual_cost' => 12000.00,
                'currency' => 'USD',
            ],
            [
                'item_code' => 'DIR-FAB-P91',
                'category' => 'Direct Cost',
                'scope_description' => 'A1.3 Alloy Steel Piping (P91) Shop Fab',
                'unit' => 'DI',
                'contract_qty' => 5568.12,
                'unit_price' => 33.80,
                'labor_cost' => 95965.09,
                'equipment_cost' => 54700.10,
                'consumable_cost' => 42224.63,
                'total_budget' => 192889.82,
                'actual_cost' => 0.00,
                'currency' => 'USD',
            ],
            [
                'item_code' => 'DIR-FAB-SS',
                'category' => 'Direct Cost',
                'scope_description' => 'A1.4 Stainless Steel Piping Shop Fab',
                'unit' => 'DI',
                'contract_qty' => 5488.59,
                'unit_price' => 21.11,
                'labor_cost' => 57662.81,
                'equipment_cost' => 32867.80,
                'consumable_cost' => 25371.62,
                'total_budget' => 115902.23,
                'actual_cost' => 0.00,
                'currency' => 'USD',
            ],
            [
                'item_code' => 'DIR-ERE-CS',
                'category' => 'Direct Cost',
                'scope_description' => 'B1.1 Carbon Steel Piping Field Erection - AG',
                'unit' => 'DI',
                'contract_qty' => 64986.13,
                'unit_price' => 23.68,
                'labor_cost' => 775828.61,
                'equipment_cost' => 442222.32,
                'consumable_cost' => 341364.59,
                'total_budget' => 1559415.52,
                'actual_cost' => 0.00,
                'currency' => 'USD',
            ],
            [
                'item_code' => 'DIR-SPT-CS',
                'category' => 'Direct Cost',
                'scope_description' => 'B3. Pipe Support Fabrication & Installation',
                'unit' => 'TON',
                'contract_qty' => 220.40,
                'unit_price' => 1850.00,
                'labor_cost' => 203870.00,
                'equipment_cost' => 116211.00,
                'consumable_cost' => 87659.00,
                'total_budget' => 407740.00,
                'actual_cost' => 0.00,
                'currency' => 'USD',
            ],
            [
                'item_code' => 'INDIR-SITE',
                'category' => 'Indirect Cost',
                'scope_description' => 'Site Management, HSE, QAQC, Akomodasi, Mobilisasi',
                'unit' => 'L/S',
                'contract_qty' => 1.00,
                'unit_price' => 950000.00,
                'labor_cost' => 550000.00,
                'equipment_cost' => 250000.00,
                'consumable_cost' => 150000.00,
                'total_budget' => 950000.00,
                'actual_cost' => 85000.00,
                'currency' => 'USD',
            ],
        ];

        foreach ($budgetItems as $b) {
            BudgetItem::firstOrCreate(
                ['item_code' => $b['item_code']],
                array_merge($b, ['project_id' => $projId, 'department_id' => $deptId])
            );
        }
    }
}
