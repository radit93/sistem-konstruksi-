<?php

namespace Database\Seeders;

use App\Models\FittingStandard;
use App\Models\MaterialStandard;
use Illuminate\Database\Seeder;

class FittingStandardSeeder extends Seeder
{
    public function run(): void
    {
        $paths = [
            database_path('data/fitting_standards_asme_b16.json'),
            database_path('data/fitting_matrix_asme.json'),
        ];
        $rows = [];
        foreach ($paths as $path) {
            if (! is_file($path)) {
                throw new \RuntimeException('Missing fitting data: '.$path);
            }

            $data = json_decode(file_get_contents($path), true);
            if (! is_array($data)) {
                throw new \RuntimeException('Invalid fitting data: '.$path);
            }

            $rows = array_merge($rows, $data);
        }

        foreach (array_chunk($rows, 250) as $chunk) {
            foreach ($chunk as $row) {
                FittingStandard::updateOrCreate(
                    ['item_code' => $row['item_code']],
                    $row
                );

                MaterialStandard::updateOrCreate(
                    ['code' => 'FIT-'.$row['item_code']],
                    [
                        'category' => $this->materialCategory($row['fitting_type']),
                        'specification' => trim(implode(' | ', array_filter([
                            $row['fitting_type'],
                            $row['asme_standard'],
                            $row['connection'],
                        ]))),
                        'material_group' => $row['material_cs'] ?: 'Carbon Steel',
                        'rating_class' => $this->pressureClass($row),
                        'class' => $this->pressureClass($row),
                        'schedule' => $row['schedule_class'],
                        'size_range' => trim(implode(' x ', array_filter([$row['nps_main'], $row['nps_secondary']]))),
                        'description' => trim(implode(' | ', array_filter([
                            'Master fitting '.$row['item_code'],
                            $row['material_cs'],
                            $row['material_ss'],
                        ]))),
                    ]
                );
            }
        }
    }

    /**
     * Pressure class hanya berlaku untuk forged fitting (B16.11): 3000#/6000#.
     * Butt-weld B16.9 memakai schedule, jadi kolom Pressure Class dikosongkan
     * agar tidak menduplikasi kolom Schedule.
     */
    private function pressureClass(array $row): ?string
    {
        return str_starts_with((string) $row['item_code'], 'FG-')
            ? ($row['schedule_class'] ?? null)
            : null;
    }

    private function materialCategory(string $type): string
    {
        $value = strtolower($type);

        return match (true) {
            str_contains($value, 'weldolet') => 'Weldolet',
            str_contains($value, 'reducing tee') || str_contains($value, 'tee reducer') => 'Tee Reducer',
            str_contains($value, 'concentric reducer') => 'Reducer Concentric',
            str_contains($value, 'eccentric reducer') => 'Reducer Eccentric',
            str_contains($value, 'reducer') => 'Reducer Concentric',
            str_contains($value, 'short radius') || str_contains($value, 'sr') => 'Elbow Short Radius',
            str_contains($value, 'long radius') || str_contains($value, 'lr') || str_contains($value, 'return bend') => 'Elbow Long Radius',
            str_contains($value, 'elbow') => 'Elbow Long Radius',
            str_contains($value, 'tee') => 'Tee',
            default => 'Fitting',
        };
    }
}
