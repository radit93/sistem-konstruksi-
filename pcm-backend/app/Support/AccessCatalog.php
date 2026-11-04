<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Single source of truth for the access model.
 *
 * Both the migrations (which must satisfy the users.role foreign key) and the
 * RolePermissionSeeder call install(). Everything here is idempotent, so running
 * it twice changes nothing.
 *
 * Rule: a role gets nothing unless a row in permission_role says so. The only
 * bypass is superadmin, handled explicitly in AppServiceProvider::boot().
 */
class AccessCatalog
{
    public const SUPERADMIN = 'superadmin';

    public static function departments(): array
    {
        return [
            ['code' => 'PMO',  'name' => 'Project Management', 'sort' => 10],
            ['code' => 'ENG',  'name' => 'Engineering',        'sort' => 20],
            ['code' => 'MAT',  'name' => 'Material Control',   'sort' => 30],
            ['code' => 'CONS', 'name' => 'Construction',       'sort' => 40],
            ['code' => 'QAQC', 'name' => 'Quality Control',    'sort' => 50],
            ['code' => 'HSE',  'name' => 'Health, Safety, Environment', 'sort' => 60],
        ];
    }

    public static function roles(): array
    {
        return [
            ['code' => 'superadmin',      'name' => 'Super Admin',      'level' => 100, 'description' => 'Mengatur seluruh sistem dan semua departemen'],
            ['code' => 'project_manager', 'name' => 'Project Manager',  'level' => 80,  'description' => 'Mengawasi job. Lihat semua project dan role, hanya baca'],
            ['code' => 'engineer',        'name' => 'Engineer',         'level' => 60,  'description' => 'Register isometrik dan folder proyek'],
            ['code' => 'material',        'name' => 'Material Control', 'level' => 50,  'description' => 'Stok pipa, heat number, mutasi gudang'],
            ['code' => 'construction',    'name' => 'Construction',     'level' => 50,  'description' => 'Fit-up, pengelasan, dan erection'],
            ['code' => 'qaqc',            'name' => 'QA/QC',            'level' => 50,  'description' => 'Inspeksi visual dan NDT'],
            ['code' => 'testpackage',     'name' => 'Test Package',     'level' => 50,  'description' => 'Hydrotest dan blinds'],
            ['code' => 'hse',             'name' => 'HSE',              'level' => 50,  'description' => 'Log keselamatan kerja'],
        ];
    }

    /**
     * [code, group_name, label, sort]
     */
    public static function permissions(): array
    {
        return [
            // Modul operasional
            ['dashboard.view',    'dashboard',    'Lihat Global Dashboard',        10],

            ['drawing.view',      'engineering',  'Lihat Engineering Drawing',      20],
            ['drawing.write',     'engineering',  'Ubah Engineering Drawing',       21],

            ['stock.view',        'material',     'Lihat Material Control',         30],
            ['stock.write',       'material',     'Ubah Material Control',          31],
            ['material_inspection.view',  'material', 'Lihat Inspeksi Material',       32],
            ['material_inspection.write', 'qaqc',     'Ubah Inspeksi Material',        33],

            ['joint.view',        'construction', 'Lihat Joint',                    40],
            ['joint.write',       'construction', 'Ubah Joint',                     41],
            ['joint.cross',       'construction', 'Joint lintas departemen',        42],

            ['inspection.view',   'qaqc',         'Lihat QA-QC Inspection',         50],
            ['inspection.write',  'qaqc',         'Ubah QA-QC Inspection',          51],

            ['testpackage.view',  'testpackage',  'Lihat Test Package',             60],
            ['testpackage.write', 'testpackage',  'Ubah Test Package',              61],

            ['hse.view',          'hse',          'Lihat HSE Safety',               70],
            ['hse.write',         'hse',          'Ubah HSE Safety',                71],

            ['scope.view',        'schedule',     'Lihat BOQ dan S-Curve',          80],
            ['scope.write',       'schedule',     'Ubah BOQ kontrak',               81],
            ['progress.write',    'schedule',     'Input progres harian',           82],

            ['report.view',       'report',       'Lihat Laporan Terpadu',          90],

            // Administrasi sistem
            ['project.view',      'project',      'Lihat layar Project (admin)',  100],
            ['project.create',    'project',      'Buat Project',                  101],
            ['project.update',    'project',      'Ubah Project',                  102],
            ['project.delete',    'project',      'Hapus Project',                 103],

            ['user.view',         'users',        'Lihat User',                    110],
            ['user.create',       'users',        'Buat User',                     111],
            ['user.update',       'users',        'Ubah User',                     112],
            ['user.delete',       'users',        'Hapus User',                    113],
            ['user.reset-password', 'users',      'Reset Password User',           114],

            ['role.view',         'role',         'Lihat Role',                    120],
            ['role.create',       'role',         'Buat Role',                     121],
            ['role.update',       'role',         'Ubah Role',                     122],
            ['role.delete',       'role',         'Hapus Role',                    123],
            ['role.assign',       'role',         'Tetapkan Role ke User',         124],

            ['access.view',       'access',       'Lihat Hak Akses',               130],
            ['access.update',     'access',       'Ubah Hak Akses',                131],

            ['department.view',   'department',   'Lihat Department',              140],
            ['department.create', 'department',   'Buat Department',               141],
            ['department.update', 'department',   'Ubah Department',               142],
            ['department.delete', 'department',   'Hapus Department',              143],
        ];
    }

    /**
     * role code => permission codes. superadmin is intentionally absent: it
     * bypasses permission checks entirely and the UI renders its column locked.
     */
    public static function matrix(): array
    {
        $readAdmin = ['project.view', 'user.view', 'role.view', 'access.view'];

        return [
            // Pengawas: lihat semua project dan semua role, hanya baca,
            // plus menulis S-Curve dan progres harian di modulnya sendiri.
            'project_manager' => array_merge($readAdmin, [
                'dashboard.view', 'scope.view', 'scope.write', 'progress.write', 'report.view',
            ]),

            // Engineer membuka folder proyek dan mengunggah drawing.
            'engineer' => [
                'dashboard.view',
                'drawing.view', 'drawing.write',
            ],

            'material' => [
                'dashboard.view',
                'stock.view', 'stock.write',
                'material_inspection.view',
            ],

            'construction' => [
                'dashboard.view',
                'joint.view', 'joint.write',
            ],

            'qaqc' => [
                'dashboard.view',
                'joint.write', 'joint.cross',
                'inspection.view', 'inspection.write',
                'material_inspection.view', 'material_inspection.write',
            ],

            'testpackage' => [
                'dashboard.view',
                'testpackage.view', 'testpackage.write',
            ],

            'hse' => [
                'dashboard.view',
                'hse.view', 'hse.write',
            ],
        ];
    }

    /** role => department, used to backfill existing users. */
    public static function roleDepartment(): array
    {
        return [
            'project_manager' => 'PMO',
            'engineer' => 'ENG',
            'material' => 'MAT',
            'construction' => 'CONS',
            'qaqc' => 'QAQC',
            'testpackage' => 'QAQC',
            'hse' => 'HSE',
        ];
    }

    public static function install(): void
    {
        $now = now();

        foreach (self::departments() as $d) {
            DB::table('departments')->updateOrInsert(
                ['code' => $d['code']],
                [
                    'name' => $d['name'],
                    'sort' => $d['sort'],
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        foreach (self::roles() as $r) {
            DB::table('roles')->updateOrInsert(
                ['code' => $r['code']],
                [
                    'name' => $r['name'],
                    'level' => $r['level'],
                    'description' => $r['description'],
                    'is_system' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        foreach (self::permissions() as [$code, $group, $label, $sort]) {
            DB::table('permissions')->updateOrInsert(
                ['code' => $code],
                ['group_name' => $group, 'label' => $label, 'sort' => $sort]
            );
        }

        $roleIds = DB::table('roles')->pluck('id', 'code');
        $permIds = DB::table('permissions')->pluck('id', 'code');

        foreach (self::matrix() as $roleCode => $codes) {
            $roleId = $roleIds[$roleCode] ?? null;
            if (! $roleId) {
                continue;
            }

            $ids = [];
            foreach ($codes as $code) {
                if (isset($permIds[$code])) {
                    $ids[] = $permIds[$code];
                }
            }

            DB::table('permission_role')->where('role_id', $roleId)->delete();
            foreach (array_unique($ids) as $permissionId) {
                DB::table('permission_role')->insert([
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                ]);
            }
        }
    }
}
