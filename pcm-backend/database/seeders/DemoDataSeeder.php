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

        // Buat beberapa joints dengan status berbeda
        $statuses = ['FITUP_OK', 'WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'];
        for ($i = 1; $i <= 15; $i++) {
            Joint::updateOrCreate(
                ['drawing_no' => $drawings[($i - 1) % 3]->drawing_no, 'seq' => $i],
                [
                    'department_id' => $consDept,
                    'line_no' => '15-MPP-AB',
                    'spool_no' => 'SP-0'.(($i - 1) % 3 + 1),
                    'item_a' => 'Pipe',
                    'spec_a' => 'A106-B',
                    'item_b' => 'Elbow',
                    'spec_b' => 'A234-WPB',
                    'size_in' => [2, 4, 6, 8][($i - 1) % 4],
                    'shop_field' => $i % 2 == 0 ? 'Shop' : 'Field',
                    'joint_type' => 'BW',
                    'method' => 'GTAW',
                    'welder' => 'W-00'.(($i % 5) + 1),
                    'fit_date' => now()->subDays(20 - $i),
                    'weld_date' => now()->subDays(18 - $i),
                    'visual' => 'PASS',
                    'status' => $statuses[min($i - 1, 4)],
                ]
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
