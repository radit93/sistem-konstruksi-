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

        // ASME B36.19M Stainless Steel & Duplex Schedules (Sch 5S, 10S, 40S, 80S)
        $stainlessSource = 'ASME B36.19M · STAINLESS & DUPLEX';
        foreach ($this->stainlessPipeRows() as $row) {
            PipeStandard::updateOrCreate(
                ['nps' => $row['nps'], 'schedule' => $row['schedule']],
                array_merge($row, [
                    'source' => $stainlessSource,
                    'is_interim' => true,
                    'department_id' => $engId,
                ])
            );
        }

        foreach ($this->materialRows() as $row) {
            $ratingClass = $row['rating_class'] ?? '';
            $rating = $row['rating'] ?? ($ratingClass === 'Class 150# / 300#' ? '150# / 300#' : 'N/A');
            $class = $row['class'] ?? ($ratingClass === 'Class 150# / 300#' ? 'Class 150 / 300' : 'N/A');
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
    private function stainlessPipeRows(): array
    {
        $path = database_path('data/pipe_schedules_stainless_b36_19.json');
        if (! is_file($path)) {
            return [];
        }

        $rows = json_decode(file_get_contents($path), true);
        return is_array($rows) ? $rows : [];
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
            // Elbow Long Radius
            [
                'code' => 'CS-ELB90LR-A234WPB',
                'category' => 'Elbow Long Radius',
                'specification' => 'ASTM A234 WPB',
                'material_group' => 'Carbon Steel',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Elbow 90° Long Radius R=1.5D Butt-Weld ASME B16.9',
            ],
            [
                'code' => 'CS-ELB45LR-A234WPB',
                'category' => 'Elbow Long Radius',
                'specification' => 'ASTM A234 WPB',
                'material_group' => 'Carbon Steel',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Elbow 45° Long Radius R=1.5D Butt-Weld ASME B16.9',
            ],
            [
                'code' => 'SS-ELB90LR-A403-304',
                'category' => 'Elbow Long Radius',
                'specification' => 'ASTM A403 WP304',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Elbow 90° Long Radius Stainless SS304 ASME B16.9',
            ],
            [
                'code' => 'SS-ELB90LR-A403-316L',
                'category' => 'Elbow Long Radius',
                'specification' => 'ASTM A403 WP316L',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Elbow 90° Long Radius Stainless SS316L ASME B16.9',
            ],
            [
                'code' => 'ALLOY-ELB90LR-WP11',
                'category' => 'Elbow Long Radius',
                'specification' => 'ASTM A234 WP11',
                'material_group' => 'Alloy Steel',
                'schedule' => 'Sch 80 / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Elbow 90° Long Radius Alloy Steel WP11 ASME B16.9',
            ],
            // Elbow Short Radius
            [
                'code' => 'CS-ELB90SR-A234WPB',
                'category' => 'Elbow Short Radius',
                'specification' => 'ASTM A234 WPB',
                'material_group' => 'Carbon Steel',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Elbow 90° Short Radius R=1.0D Butt-Weld ASME B16.9',
            ],
            [
                'code' => 'SS-ELB90SR-A403-304',
                'category' => 'Elbow Short Radius',
                'specification' => 'ASTM A403 WP304',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Elbow 90° Short Radius Stainless SS304 ASME B16.9',
            ],
            [
                'code' => 'SS-ELB90SR-A403-316L',
                'category' => 'Elbow Short Radius',
                'specification' => 'ASTM A403 WP316L',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Elbow 90° Short Radius Stainless SS316L ASME B16.9',
            ],
            [
                'code' => 'ALLOY-ELB90SR-WP11',
                'category' => 'Elbow Short Radius',
                'specification' => 'ASTM A234 WP11',
                'material_group' => 'Alloy Steel',
                'schedule' => 'Sch 80 / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Elbow 90° Short Radius Alloy Steel WP11 ASME B16.9',
            ],
            // Tee Equal
            [
                'code' => 'CS-TEE-A234WPB',
                'category' => 'Tee',
                'specification' => 'ASTM A234 WPB',
                'material_group' => 'Carbon Steel',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Equal / Straight Tee Butt-Weld ASME B16.9',
            ],
            [
                'code' => 'SS-TEE-A403-304',
                'category' => 'Tee',
                'specification' => 'ASTM A403 WP304',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Equal Tee Stainless Steel SS304 ASME B16.9',
            ],
            [
                'code' => 'SS-TEE-A403-316L',
                'category' => 'Tee',
                'specification' => 'ASTM A403 WP316L',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Equal Tee Stainless Steel SS316L ASME B16.9',
            ],
            [
                'code' => 'ALLOY-TEE-WP11',
                'category' => 'Tee',
                'specification' => 'ASTM A234 WP11',
                'material_group' => 'Alloy Steel',
                'schedule' => 'Sch 80 / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Equal Tee Alloy Steel WP11 ASME B16.9',
            ],
            // Tee Reducer
            [
                'code' => 'CS-TEERED-A234WPB',
                'category' => 'Tee Reducer',
                'specification' => 'ASTM A234 WPB',
                'material_group' => 'Carbon Steel',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Reducing Tee (Tee Reduksi) Butt-Weld ASME B16.9',
            ],
            [
                'code' => 'SS-TEERED-A403-304',
                'category' => 'Tee Reducer',
                'specification' => 'ASTM A403 WP304',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Reducing Tee Stainless Steel SS304 ASME B16.9',
            ],
            [
                'code' => 'SS-TEERED-A403-316L',
                'category' => 'Tee Reducer',
                'specification' => 'ASTM A403 WP316L',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Reducing Tee Stainless Steel SS316L ASME B16.9',
            ],
            [
                'code' => 'ALLOY-TEERED-WP11',
                'category' => 'Tee Reducer',
                'specification' => 'ASTM A234 WP11',
                'material_group' => 'Alloy Steel',
                'schedule' => 'Sch 80 / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Reducing Tee Alloy Steel WP11 ASME B16.9',
            ],
            // Reducer Concentric
            [
                'code' => 'CS-REDCON-A234WPB',
                'category' => 'Reducer Concentric',
                'specification' => 'ASTM A234 WPB',
                'material_group' => 'Carbon Steel',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Concentric Reducer (Konsentris) Butt-Weld ASME B16.9',
            ],
            [
                'code' => 'SS-REDCON-A403-304',
                'category' => 'Reducer Concentric',
                'specification' => 'ASTM A403 WP304',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Concentric Reducer Stainless SS304 ASME B16.9',
            ],
            [
                'code' => 'SS-REDCON-A403-316L',
                'category' => 'Reducer Concentric',
                'specification' => 'ASTM A403 WP316L',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Concentric Reducer Stainless SS316L ASME B16.9',
            ],
            [
                'code' => 'ALLOY-REDCON-WP11',
                'category' => 'Reducer Concentric',
                'specification' => 'ASTM A234 WP11',
                'material_group' => 'Alloy Steel',
                'schedule' => 'Sch 80 / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Concentric Reducer Alloy WP11 ASME B16.9',
            ],
            // Reducer Eccentric
            [
                'code' => 'CS-REDECC-A234WPB',
                'category' => 'Reducer Eccentric',
                'specification' => 'ASTM A234 WPB',
                'material_group' => 'Carbon Steel',
                'schedule' => 'Sch 40 / Sch 80',
                'size_range' => '1/2" - 24"',
                'description' => 'Eccentric Reducer (Eksentris) Butt-Weld ASME B16.9',
            ],
            [
                'code' => 'SS-REDECC-A403-304',
                'category' => 'Reducer Eccentric',
                'specification' => 'ASTM A403 WP304',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Eccentric Reducer Stainless SS304 ASME B16.9',
            ],
            [
                'code' => 'SS-REDECC-A403-316L',
                'category' => 'Reducer Eccentric',
                'specification' => 'ASTM A403 WP316L',
                'material_group' => 'Stainless Steel',
                'schedule' => 'Sch 10S / Sch 40S',
                'size_range' => '1/2" - 12"',
                'description' => 'Eccentric Reducer Stainless SS316L ASME B16.9',
            ],
            [
                'code' => 'ALLOY-REDECC-WP11',
                'category' => 'Reducer Eccentric',
                'specification' => 'ASTM A234 WP11',
                'material_group' => 'Alloy Steel',
                'schedule' => 'Sch 80 / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Eccentric Reducer Alloy WP11 ASME B16.9',
            ],
            // Weldolet
            [
                'code' => 'CS-WOL-A105',
                'category' => 'Weldolet',
                'specification' => 'ASTM A105',
                'material_group' => 'Carbon Steel',
                'schedule' => 'STD / XS / Sch 160',
                'size_range' => '1/2" - 24"',
                'description' => 'Weldolet Branch Outlet Forged Carbon Steel MSS-SP-97',
            ],
            [
                'code' => 'SS-WOL-A182-304',
                'category' => 'Weldolet',
                'specification' => 'ASTM A182 F304',
                'material_group' => 'Stainless Steel',
                'schedule' => 'STD / XS',
                'size_range' => '1/2" - 12"',
                'description' => 'Weldolet Stainless Steel F304 MSS-SP-97',
            ],
            [
                'code' => 'SS-WOL-A182-316L',
                'category' => 'Weldolet',
                'specification' => 'ASTM A182 F316L',
                'material_group' => 'Stainless Steel',
                'schedule' => 'STD / XS',
                'size_range' => '1/2" - 12"',
                'description' => 'Weldolet Stainless Steel F316L MSS-SP-97',
            ],
            [
                'code' => 'ALLOY-WOL-A182-F11',
                'category' => 'Weldolet',
                'specification' => 'ASTM A182 F11',
                'material_group' => 'Alloy Steel',
                'schedule' => 'XS / Sch 160',
                'size_range' => '1" - 16"',
                'description' => 'Weldolet Alloy Steel F11 MSS-SP-97',
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
