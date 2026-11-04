<?php

namespace Database\Seeders;

use App\Models\MaterialStandard;
use App\Models\PipingClassTemplate;
use Illuminate\Database\Seeder;

/**
 * Master template komponen per piping class untuk otomasi MTO (Priority C).
 */
class PipingClassTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $standards = MaterialStandard::pluck('id', 'code');

        $templates = [
            // Piping class A1A — Carbon Steel 150#
            ['A1A', 'Pipe', 'Pipe Seamless BE ASTM A106 Gr. B', 'Sch 40', 'ASTM A106 Gr. B', 'CS-PIPE-A106B', 'meter', 1.2, 'PER_DI'],
            ['A1A', 'Elbow 90 LR', 'Elbow 90 Deg Long Radius BW ASTM A234 WPB', 'Sch 40', 'ASTM A234 WPB', 'CS-FIT-A234WPB', 'buah', 1.0, 'PER_JOINT'],
            ['A1A', 'Flange WN', 'Flange Weld Neck RF Class 150# ASTM A105', '150# Sch 40', 'ASTM A105', 'CS-FLG-A105', 'buah', 0.25, 'PER_JOINT'],
            ['A1A', 'Gasket', 'Spiral Wound Gasket SS316L / Graphite 150#', '150#', 'SS316L / Graphite', 'GSK-SW-SS316', 'buah', 0.25, 'PER_JOINT'],
            ['A1A', 'Stud Bolt', 'Stud Bolt with 2 Heavy Hex Nuts ASTM A193 B7', 'UNC', 'ASTM A193 B7 / A194 2H', 'FST-A193-B7', 'set', 1.0, 'PER_JOINT'],

            // Piping class A2A — Carbon Steel 300#
            ['A2A', 'Pipe', 'Pipe Seamless BE ASTM A106 Gr. B Sch 80', 'Sch 80', 'ASTM A106 Gr. B', 'CS-PIPE-A106B', 'meter', 1.2, 'PER_DI'],
            ['A2A', 'Elbow 90 LR', 'Elbow 90 Deg Long Radius BW ASTM A234 WPB Sch 80', 'Sch 80', 'ASTM A234 WPB', 'CS-FIT-A234WPB', 'buah', 1.0, 'PER_JOINT'],
            ['A2A', 'Flange WN', 'Flange Weld Neck RF Class 300# ASTM A105', '300# Sch 80', 'ASTM A105', 'CS-FLG-A105', 'buah', 0.25, 'PER_JOINT'],
            ['A2A', 'Gasket', 'Spiral Wound Gasket SS316L / Graphite 300#', '300#', 'SS316L / Graphite', 'GSK-SW-SS316', 'buah', 0.25, 'PER_JOINT'],
            ['A2A', 'Stud Bolt', 'Stud Bolt with 2 Heavy Hex Nuts ASTM A193 B7', 'UNC', 'ASTM A193 B7 / A194 2H', 'FST-A193-B7', 'set', 1.0, 'PER_JOINT'],
        ];

        foreach ($templates as [$class, $type, $description, $rating, $spec, $standardCode, $unit, $ratio, $basis]) {
            PipingClassTemplate::updateOrCreate(
                ['piping_class' => $class, 'component_type' => $type],
                [
                    'description' => $description,
                    'default_rating_sch' => $rating,
                    'material_spec' => $spec,
                    'material_standard_id' => $standards[$standardCode] ?? null,
                    'unit' => $unit,
                    'ratio_formula' => $ratio,
                    'basis' => $basis,
                ]
            );
        }
    }
}
