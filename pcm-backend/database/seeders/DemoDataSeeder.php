<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Drawing;
use App\Models\Joint;
use App\Models\Project;
use App\Models\Scope;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $project = Project::first();
        $engDept = Department::where('code', 'ENG')->value('id');
        $consDept = Department::where('code', 'CONS')->value('id');
        $pmoDept = Department::where('code', 'PMO')->value('id');

        // Buat beberapa drawings
        $drawings = [];
        for ($i = 1; $i <= 3; $i++) {
            $drawings[] = Drawing::updateOrCreate(
                ['drawing_no' => '2428-M-15-MPP-AB-SHT'.$i],
                [
                    'project_id' => $project->id,
                    'line_no' => '15-MPP-AB',
                    'area' => 'MPP',
                    'rev' => '0',
                    'status' => 'IFC',
                    'total_dia_inch' => 50 + ($i * 10),
                    'total_joints' => 10 + ($i * 5),
                    'department_id' => $engDept,
                ]
            );
        }

        // Buat beberapa joints dengan status berbeda. 30 joint (spool SP-01..SP-06)
        // supaya monitoring Construction Shop & Field Erection terasa hidup,
        // sekaligus menjadi demo checklist fit-up QC dan repair tracking.
        $statusFlow = ['RECEIVED', 'ISSUED', 'FITUP_OK', 'WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'];
        $sizes = [2, 3, 4, 6, 8, 10];
        $itemBOptions = ['Elbow', 'Tee', 'Reducer', 'Cap'];

        for ($i = 1; $i <= 30; $i++) {
            $size = $sizes[($i - 1) % count($sizes)];
            // Index mengikuti $i (bukan $i - 1) agar pasangan status-flow tidak
            // membuat joint ber-repair berstatus paling awal (RECEIVED/ISSUED).
            $status = $statusFlow[$i % count($statusFlow)];
            $itemB = $itemBOptions[($i - 1) % count($itemBOptions)];

            // Checklist fit-up QC: tersedia pada joint yang sudah lewat tahap ISSUED,
            // satu bevel NOK agar repair tracking punya konteks yang jelas.
            $pastIssued = ! in_array($status, ['RECEIVED', 'ISSUED'], true);
            $fields = [
                'department_id' => $consDept,
                'line_no' => '15-MPP-AB',
                'spool_no' => 'SP-'.str_pad((string) ((($i - 1) % 6) + 1), 2, '0', STR_PAD_LEFT),
                'item_a' => 'Pipe',
                'spec_a' => 'A106-B',
                'item_b' => $itemB,
                'spec_b' => 'A234-WPB',
                'size_in' => $size,
                'shop_field' => $i % 2 == 0 ? 'Shop' : 'Field',
                'joint_type' => 'BW',
                'method' => $size >= 6 ? 'GTAW + SMAW' : 'GTAW',
                'welder' => 'W-00'.(($i % 5) + 1),
                'fit_date' => now()->subDays(20 - ($i % 20)),
                'weld_date' => now()->subDays(18 - ($i % 18)),
                'visual' => 'PASS',
                'status' => $status,
            ];

            if ($pastIssued) {
                $fields = array_merge($fields, [
                    'fitup_alignment' => 'OK',
                    'fitup_root_gap' => 'OK',
                    'fitup_bevel' => $i % 9 === 0 ? 'NOK' : 'OK',
                    'fitup_hi_low' => 'OK',
                    'fitup_tack_weld' => 'OK',
                    'fitup_inspector' => 'QC-0'.(($i % 2) + 1),
                    'fitup_inspection_date' => now()->subDays(20 - ($i % 20))->toDateString(),
                    'welding_process' => $size >= 6 ? 'GTAW + SMAW' : 'GTAW',
                    'filler_material' => $size >= 6 ? 'ER70S-6 / E7018' : 'ER70S-2',
                    'preheat' => $size >= 6 ? '25' : '-',
                    'interpass_temperature' => '120',
                    'construction_remarks' => $itemB === 'Reducer' ? 'Perhatikan hi-lo reducer' : null,
                ]);
            }

            // Repair tracking: bevel NOK di-patch dengan grinding (seq 9 = Field, seq 18 = Shop).
            if ($i === 9 || $i === 18) {
                $fields = array_merge($fields, [
                    'repair_no' => 'R-00'.($i === 9 ? 1 : 2),
                    'repair_defect' => 'Bevel tidak sesuai persiapan fabrikasi',
                    'repair_method' => 'Grinding',
                    'repair_welder' => 'W-00'.(($i % 5) + 1),
                    'repair_date' => now()->subDays(2),
                    'repair_remarks' => 'Bevel di-grinding ulang mengikuti WPS lalu fit-up re-check OK.',
                ]);
            }

            Joint::updateOrCreate(
                ['drawing_no' => $drawings[($i - 1) % 3]->drawing_no, 'seq' => $i],
                $fields
            );
        }

        // Buat beberapa scopes
        Scope::updateOrCreate(
            ['scope' => 'A1.1. Carbon Steel Piping'],
            [
                'department_id' => $pmoDept,
                'unit' => 'DI',
                'contract_qty' => 5000,
                'cumulative_qty' => 320,
            ]
        );

        Scope::updateOrCreate(
            ['scope' => 'A1.2. Stainless Steel Piping'],
            [
                'department_id' => $pmoDept,
                'unit' => 'DI',
                'contract_qty' => 1200,
                'cumulative_qty' => 85,
            ]
        );
    }
}
