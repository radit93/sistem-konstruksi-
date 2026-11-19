<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\MaterialStandard;
use Illuminate\Database\Seeder;

/**
 * Master filler/consumable las. Dipakai dropdown Filler Material di modul
 * Construction supaya nilainya tidak diketik bebas dan tetap satu sumber
 * dengan katalog material.
 */
class FillerMaterialSeeder extends Seeder
{
    /**
     * @var array<int, array{code: string, spec: string, group: string}>
     */
    private array $fillers = [
        ['code' => 'ER70S-2', 'spec' => 'AWS A5.18 ER70S-2', 'group' => 'Carbon Steel'],
        ['code' => 'ER70S-3', 'spec' => 'AWS A5.18 ER70S-3', 'group' => 'Carbon Steel'],
        ['code' => 'ER70S-6', 'spec' => 'AWS A5.18 ER70S-6', 'group' => 'Carbon Steel'],
        ['code' => 'E6010', 'spec' => 'AWS A5.1 E6010', 'group' => 'Carbon Steel'],
        ['code' => 'E7018', 'spec' => 'AWS A5.1 E7018', 'group' => 'Carbon Steel'],
        ['code' => 'ER80S-B2', 'spec' => 'AWS A5.28 ER80S-B2', 'group' => 'Alloy Steel'],
        ['code' => 'E8018-B2', 'spec' => 'AWS A5.5 E8018-B2', 'group' => 'Alloy Steel'],
        ['code' => 'ER90S-B3', 'spec' => 'AWS A5.28 ER90S-B3', 'group' => 'Alloy Steel'],
        ['code' => 'E9018-B3', 'spec' => 'AWS A5.5 E9018-B3', 'group' => 'Alloy Steel'],
        ['code' => 'ER308L', 'spec' => 'AWS A5.9 ER308L', 'group' => 'Stainless Steel'],
        ['code' => 'E308L-16', 'spec' => 'AWS A5.4 E308L-16', 'group' => 'Stainless Steel'],
        ['code' => 'ER316L', 'spec' => 'AWS A5.9 ER316L', 'group' => 'Stainless Steel'],
        ['code' => 'E316L-16', 'spec' => 'AWS A5.4 E316L-16', 'group' => 'Stainless Steel'],
    ];

    public function run(): void
    {
        $departmentId = Department::query()->where('code', 'ENG')->value('id');

        foreach ($this->fillers as $filler) {
            MaterialStandard::updateOrCreate(
                ['code' => $filler['code']],
                [
                    'category' => 'Consumable',
                    'specification' => $filler['spec'],
                    'material_group' => $filler['group'],
                    'rating' => 'N/A',
                    'class' => 'N/A',
                    'size_range' => '2.4 - 4.0 mm',
                    'description' => 'Filler metal / welding consumable '.$filler['code'],
                    'source' => 'AWS',
                    'department_id' => $departmentId,
                ]
            );
        }
    }
}
