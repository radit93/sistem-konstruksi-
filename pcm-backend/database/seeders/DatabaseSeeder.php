<?php

namespace Database\Seeders;

use App\Models\Drawing;
use App\Models\Department;
use App\Models\Joint;
use App\Models\Project;
use App\Models\Scope;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        $departments = Department::pluck('id', 'code');

        // Demo accounts, password: pcm123
        // The project manager keeps the manager@ address so the documented
        // login keeps working after the role was renamed.
        $accounts = [
            ['superadmin@pcm.local',   'Super Admin',     'superadmin',      null],
            ['manager@pcm.local',      'Project Manager', 'project_manager', 'PMO'],
            ['engineer@pcm.local',     'Engineer',        'engineer',        'ENG'],
            ['material@pcm.local',     'Material Control', 'material',       'MAT'],
            ['construction@pcm.local', 'Construction',    'construction',    'CONS'],
            ['qaqc@pcm.local',         'QA/QC',           'qaqc',            'QAQC'],
            ['testpackage@pcm.local',  'Test Package',    'testpackage',     'QAQC'],
            ['hse@pcm.local',          'HSE',             'hse',             'HSE'],
        ];

        foreach ($accounts as [$email, $name, $role, $departmentCode]) {
            User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make('pcm123'),
                    'role' => $role,
                    'department_id' => $departmentCode ? ($departments[$departmentCode] ?? null) : null,
                    'is_active' => true,
                ]
            );
        }

        $seedFile = base_path('../web/lib/seed.json');
        $seed = file_exists($seedFile) ? json_decode(file_get_contents($seedFile), true) : ['joints' => [], 'progress' => []];

        $project = Project::updateOrCreate(['job_no' => '2428'], [
            'name' => 'PCM Piping (dari Excel)', 'client' => 'Contoh',
        ]);

        $drawings = collect($seed['joints'] ?? [])->pluck('drawing_no')->unique()->values();
        foreach ($drawings as $d) {
            Drawing::updateOrCreate(['drawing_no' => $d], [
                'project_id' => $project->id,
                'line_no' => collect($seed['joints'])->firstWhere('drawing_no', $d)['line_no'] ?? null,
                'area' => 'MPP', 'rev' => '0', 'status' => 'active',
                'department_id' => $departments['ENG'] ?? null,
            ]);
        }

        foreach ($seed['joints'] ?? [] as $j) {
            Joint::updateOrCreate(
                ['drawing_no' => $j['drawing_no'], 'seq' => $j['seq']],
                array_merge($j, [
                    'fit_date' => $this->normDate($j['fit_date'] ?? null),
                    'weld_date' => $this->normDate($j['weld_date'] ?? null),
                    'department_id' => $departments['CONS'] ?? null,
                ])
            );
        }

        foreach ($seed['progress'] ?? [] as $p) {
            Scope::updateOrCreate(['scope' => $p['scope']], [
                'unit' => $p['unit'], 'contract_qty' => $p['contract_qty'],
                'department_id' => $departments['PMO'] ?? null,
            ]);
        }
    }

    private function normDate($v): ?string
    {
        if (! $v) {
            return null;
        }
        $d = substr(trim((string) $v), 0, 10);
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) ? $d : null;
    }
}
