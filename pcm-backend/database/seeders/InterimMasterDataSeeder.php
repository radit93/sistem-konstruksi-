<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\MaterialStandard;
use App\Models\PipeStandard;
use Illuminate\Database\Seeder;

/**
 * Interim company-wide master data.
 *
 * Pipe dimensions follow the ASME B36.10M schedule table published by Van
 * Leeuwen (2015). Material specifications are common ASTM references. Both
 * are marked is_interim so they can be replaced by the company standard
 * tables without changing the application flow.
 */
class InterimMasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $engId = Department::where('code', 'ENG')->value('id');
        $source = 'ASME B36.10M · VAN LEEUWEN 2015';

        // PDF Van Leeuwen 2015 replaces the earlier interim dimension list.
        PipeStandard::query()->delete();

        foreach ($this->pipeRows() as $row) {
            PipeStandard::updateOrCreate(
                ['nps' => $row['nps'], 'schedule' => $row['schedule']],
                array_merge($row, [
                    'source' => $source,
                    'is_interim' => true,
                    'department_id' => $engId,
                ])
            );
        }

        foreach ($this->materialRows() as $row) {
            MaterialStandard::updateOrCreate(
                ['code' => $row['code']],
                array_merge($row, [
                    'source' => 'INTERIM ASTM',
                    'is_interim' => true,
                    'department_id' => $engId,
                ])
            );
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function pipeRows(): array
    {
        $path = database_path('data/pipe_schedules_asme_b36_10.json');
        if (! is_file($path)) {
            throw new \RuntimeException('Missing pipe schedule data: '.$path);
        }

        $rows = json_decode(file_get_contents($path), true);
        if (! is_array($rows)) {
            throw new \RuntimeException('Invalid pipe schedule data: '.$path);
        }

        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function materialRows(): array
    {
        return [
            [
                'code' => 'CS-PIPE-A106B',
                'category' => 'Pipe',
                'specification' => 'ASTM A106 Gr. B',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Pipa seamless karbon untuk layanan temperatur dan tekanan menengah.',
            ],
            [
                'code' => 'CS-PIPE-A53B',
                'category' => 'Pipe',
                'specification' => 'ASTM A53 Gr. B',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Pipa karbon las/sans sambungan untuk layanan umum.',
            ],
            [
                'code' => 'SS-PIPE-A312-304',
                'category' => 'Pipe',
                'specification' => 'ASTM A312 TP304',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 10S / 40S / 80S',
                'size_range' => '1/2" - 12"',
                'description' => 'Pipa stainless austenitik untuk fluida korosif.',
            ],
            [
                'code' => 'SS-PIPE-A312-316L',
                'category' => 'Pipe',
                'specification' => 'ASTM A312 TP316L',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 10S / 40S / 80S',
                'size_range' => '1/2" - 12"',
                'description' => 'Pipa stainless low-carbon dengan ketahanan korosi lebih tinggi.',
            ],
            [
                'code' => 'ALLOY-PIPE-A335-P11',
                'category' => 'Pipe',
                'specification' => 'ASTM A335 P11',
                'material_group' => 'Alloy Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40 / Sch 80 / 160',
                'size_range' => '1/2" - 24"',
                'description' => 'Pipa alloy chrome-moly untuk temperatur tinggi.',
            ],
            [
                'code' => 'CS-FIT-A234WPB',
                'category' => 'Fitting',
                'specification' => 'ASTM A234 WPB',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Fitting las tumpul karbon: elbow, tee, reducer, cap.',
            ],
            [
                'code' => 'ALLOY-FIT-A234-WP11',
                'category' => 'Fitting',
                'specification' => 'ASTM A234 WP11',
                'material_group' => 'Alloy Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40 / Sch 80 / 160',
                'size_range' => '1/2" - 24"',
                'description' => 'Fitting alloy chrome-moly untuk layanan temperatur tinggi.',
            ],
            [
                'code' => 'SS-FIT-A403-WP304',
                'category' => 'Fitting',
                'specification' => 'ASTM A403 WP304',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 10S / 40S / 80S',
                'size_range' => '1/2" - 12"',
                'description' => 'Fitting stainless austenitik 304.',
            ],
            [
                'code' => 'SS-FIT-A403-WP316L',
                'category' => 'Fitting',
                'specification' => 'ASTM A403 WP316L',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 10S / 40S / 80S',
                'size_range' => '1/2" - 12"',
                'description' => 'Fitting stainless low-carbon 316L.',
            ],
            [
                'code' => 'CS-FLG-A105',
                'category' => 'Flange',
                'specification' => 'ASTM A105',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '1/2" - 24"',
                'description' => 'Flange tempa karbon: WN, SO, BL, SW, THD.',
            ],
            [
                'code' => 'ALLOY-FLG-A182-F11',
                'category' => 'Flange',
                'specification' => 'ASTM A182 F11',
                'material_group' => 'Alloy Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '1/2" - 24"',
                'description' => 'Flange tempa alloy chrome-moly F11.',
            ],
            [
                'code' => 'SS-FLG-A182-F304',
                'category' => 'Flange',
                'specification' => 'ASTM A182 F304',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '1/2" - 12"',
                'description' => 'Flange tempa stainless 304.',
            ],
            [
                'code' => 'SS-FLG-A182-F316L',
                'category' => 'Flange',
                'specification' => 'ASTM A182 F316L',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '1/2" - 12"',
                'description' => 'Flange tempa stainless low-carbon 316L.',
            ],
            [
                'code' => 'CS-VLV-A216-WCB',
                'category' => 'Valve',
                'specification' => 'ASTM A216 WCB',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '2" - 12"',
                'description' => 'Body valve cast carbon steel WCB.',
            ],
            [
                'code' => 'SS-VLV-A351-CF8',
                'category' => 'Valve',
                'specification' => 'ASTM A351 CF8',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '2" - 12"',
                'description' => 'Body valve cast stainless CF8 (304).',
            ],
            [
                'code' => 'SS-VLV-A351-CF8M',
                'category' => 'Valve',
                'specification' => 'ASTM A351 CF8M',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '2" - 12"',
                'description' => 'Body valve cast stainless CF8M (316).',
            ],
            [
                'code' => 'GSK-SW-316L-GR',
                'category' => 'Gasket',
                'specification' => 'SS316L Spiral Wound + Graphite',
                'material_group' => 'Stainless Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '1/2" - 24"',
                'description' => 'Gasket spiral wound stainless 316L dengan filler graphite.',
            ],
            [
                'code' => 'BOLT-A193-B7',
                'category' => 'Fastener',
                'specification' => 'ASTM A193 B7',
                'material_group' => 'Alloy Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '1/2" - 4"',
                'description' => 'Baut stud alloy steel untuk flange dan valve.',
            ],
            [
                'code' => 'NUT-A194-2H',
                'category' => 'Fastener',
                'specification' => 'ASTM A194 2H',
                'material_group' => 'Carbon Steel',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'N/A',
                'size_range' => '1/2" - 4"',
                'description' => 'Mur heavy hex untuk baut A193 B7.',
            ],
        ];
    }
}
