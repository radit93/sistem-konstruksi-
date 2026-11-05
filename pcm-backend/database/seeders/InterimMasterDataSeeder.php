<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\LineService;
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
            $rating = $row['rating'] ?? ($row['rating_class'] === 'Class 150# / 300#' ? '150# / 300#' : 'N/A');
            $class = $row['class'] ?? ($row['rating_class'] === 'Class 150# / 300#' ? 'Class 150 / 300' : 'N/A');
            MaterialStandard::updateOrCreate(
                ['code' => $row['code']],
                array_merge($row, [
                    'rating' => $rating,
                    'class' => $class,
                    'source' => 'INTERIM ASTM',
                    'is_interim' => true,
                    'department_id' => $engId,
                ])
            );
        }

        // Standard Industrial Line Services Master
        foreach ($this->lineServiceRows() as $row) {
            LineService::updateOrCreate(
                ['line_no' => $row['line_no']],
                array_merge($row, [
                    'department_id' => $engId,
                ])
            );
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function lineServiceRows(): array
    {
        $path = database_path('data/standard_line_services.json');
        if (! is_file($path)) {
            return [];
        }

        $rows = json_decode(file_get_contents($path), true);
        return is_array($rows) ? $rows : [];
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
                'rating' => 'N/A',
                'class' => 'N/A',
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
                'rating' => 'N/A',
                'class' => 'N/A',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Pipa karbon untuk utilitas dan perpipaan umum.',
            ],
            [
                'code' => 'SS-PIPE-A312-304',
                'category' => 'Pipe',
                'specification' => 'ASTM A312 TP304',
                'material_group' => 'Stainless Steel',
                'rating' => 'N/A',
                'class' => 'N/A',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Pipa stainless steel austenitic tahan korosi menengah.',
            ],
            [
                'code' => 'SS-PIPE-A312-316L',
                'category' => 'Pipe',
                'specification' => 'ASTM A312 TP316L',
                'material_group' => 'Stainless Steel',
                'rating' => 'N/A',
                'class' => 'N/A',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Pipa stainless steel karbon rendah tahan korosi klorida.',
            ],
            [
                'code' => 'ALLOY-PIPE-A335-P11',
                'category' => 'Pipe',
                'specification' => 'ASTM A335 Gr. P11',
                'material_group' => 'Alloy Steel',
                'rating' => 'N/A',
                'class' => 'N/A',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 80 / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Pipa baja paduan Cr-Mo temperatur tinggi.',
            ],
            [
                'code' => 'CS-FIT-A234WPB',
                'category' => 'Fitting',
                'specification' => 'ASTM A234 WPB',
                'material_group' => 'Carbon Steel',
                'rating' => 'N/A',
                'class' => 'N/A',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Fitting las tumpul pipa karbon (Elbow/Tee/Reducer).',
            ],
            [
                'code' => 'ALLOY-FIT-A234-WP11',
                'category' => 'Fitting',
                'specification' => 'ASTM A234 WP11',
                'material_group' => 'Alloy Steel',
                'rating' => 'N/A',
                'class' => 'N/A',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 80 / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Fitting paduan Cr-Mo las tumpul layanan uap panas.',
            ],
            [
                'code' => 'SS-FIT-A403-WP304',
                'category' => 'Fitting',
                'specification' => 'ASTM A403 WP304',
                'material_group' => 'Stainless Steel',
                'rating' => 'N/A',
                'class' => 'N/A',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Fitting stainless steel 304 tahan korosi.',
            ],
            [
                'code' => 'SS-FIT-A403-WP316L',
                'category' => 'Fitting',
                'specification' => 'ASTM A403 WP316L',
                'material_group' => 'Stainless Steel',
                'rating' => 'N/A',
                'class' => 'N/A',
                'rating_class' => 'N/A',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Fitting stainless steel 316L tahan fluida asam.',
            ],
            [
                'code' => 'CS-FLG-A105',
                'category' => 'Flange',
                'specification' => 'ASTM A105',
                'material_group' => 'Carbon Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'Sch 40 RF',
                'size_range' => '1/2" - 24"',
                'description' => 'Flange baja tempa jenis Weld Neck dan Blind.',
            ],
            [
                'code' => 'ALLOY-FLG-A182-F11',
                'category' => 'Flange',
                'specification' => 'ASTM A182 F11',
                'material_group' => 'Alloy Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'Sch 80 RF',
                'size_range' => '1" - 16"',
                'description' => 'Flange paduan temperatur dan tekanan uap tinggi.',
            ],
            [
                'code' => 'SS-FLG-A182-F304',
                'category' => 'Flange',
                'specification' => 'ASTM A182 F304',
                'material_group' => 'Stainless Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'Sch 10S RF',
                'size_range' => '1/2" - 12"',
                'description' => 'Flange stainless steel austenitik.',
            ],
            [
                'code' => 'SS-FLG-A182-F316L',
                'category' => 'Flange',
                'specification' => 'ASTM A182 F316L',
                'material_group' => 'Stainless Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'Sch 10S RF',
                'size_range' => '1/2" - 12"',
                'description' => 'Flange stainless steel 316L ketahanan korosi ekstra.',
            ],
            [
                'code' => 'CS-VLV-A216-WCB',
                'category' => 'Valve',
                'specification' => 'ASTM A216 Gr. WCB',
                'material_group' => 'Carbon Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'RF Flanged',
                'size_range' => '2" - 12"',
                'description' => 'Bodi katup baja tuang Gate, Globe, Check valve.',
            ],
            [
                'code' => 'SS-VLV-A351-CF8',
                'category' => 'Valve',
                'specification' => 'ASTM A351 CF8',
                'material_group' => 'Stainless Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'RF Flanged',
                'size_range' => '1/2" - 8"',
                'description' => 'Bodi katup stainless steel coran austenitik (SS 304).',
            ],
            [
                'code' => 'SS-VLV-A351-CF8M',
                'category' => 'Valve',
                'specification' => 'ASTM A351 CF8M',
                'material_group' => 'Stainless Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'RF Flanged',
                'size_range' => '1/2" - 8"',
                'description' => 'Bodi katup stainless steel coran Mo-bearing (SS 316).',
            ],
            [
                'code' => 'GSK-SW-316L-GR',
                'category' => 'Gasket',
                'specification' => 'ASME B16.20 Spiral Wound 316L/Graphite',
                'material_group' => 'Stainless Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'RF Gasket',
                'size_range' => '1/2" - 24"',
                'description' => 'Gasket spiral wound dengan outer ring carbon steel.',
            ],
            [
                'code' => 'BOLT-A193-B7',
                'category' => 'Fastener',
                'specification' => 'ASTM A193 Gr. B7',
                'material_group' => 'Alloy Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'UNC / UN',
                'size_range' => '1/2" - 2-1/2"',
                'description' => 'Stud bolt baja paduan kekuatan tinggi untuk sambungan flange.',
            ],
            [
                'code' => 'NUT-A194-2H',
                'category' => 'Fastener',
                'specification' => 'ASTM A194 Gr. 2H',
                'material_group' => 'Carbon Steel',
                'rating' => '150# / 300#',
                'class' => 'Class 150 / 300',
                'rating_class' => 'Class 150# / 300#',
                'schedule' => 'Heavy Hex',
                'size_range' => '1/2" - 2-1/2"',
                'description' => 'Mur heavy hex karbon mutu tinggi pasangan baut A193 B7.',
            ],
        ];
    }
}
