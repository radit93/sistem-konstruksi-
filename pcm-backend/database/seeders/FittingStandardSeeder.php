<?php

namespace Database\Seeders;

use App\Models\FittingStandard;
use Illuminate\Database\Seeder;

class FittingStandardSeeder extends Seeder
{
    /**
     * Seed tabel fitting_standards dari dataset canonical
     * database/data/fitting_master_asme.json (ASME B16.9 / B16.11 /
     * MSS-SP-97 / MSS-SP-43, 2.303 baris).
     *
     * Hanya menulis ke fitting_standards — tidak lagi membuat baris
     * material_standards per-ukuran (FIT-*).
     */
    public function run(): void
    {
        $path = database_path('data/fitting_master_asme.json');
        if (! is_file($path)) {
            throw new \RuntimeException('Missing canonical fitting master: '.$path);
        }

        $rows = json_decode(file_get_contents($path), true);
        if (! is_array($rows)) {
            throw new \RuntimeException('Invalid canonical fitting data: '.$path);
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            $fittingStandards = $chunk;
            FittingStandard::upsert(
                $this->toInsertRows($fittingStandards),
                ['item_code'],
                $this->updateColumns($chunk)
            );
        }
    }

    /**
     * Baris insert dalam bentuk array kunci => nilai (tanpa id/timestamps,
     * dibiarkan default DB agar upsert tetap ringan).
     */
    private function toInsertRows(array $chunk): array
    {
        $columns = [
            'item_code', 'category', 'fitting_type', 'asme_standard', 'connection',
            'nps_main', 'dn_main_mm', 'od_main_mm', 'nps_secondary', 'dn_secondary_mm',
            'od_secondary_mm', 'dimension_primary_mm', 'dimension_secondary_mm',
            'schedule_class', 'wall_mm', 'material_cs', 'material_ss',
            'weight_cs_kg', 'weight_ss_kg', 'status', 'source_reference',
        ];

        return array_map(
            fn (array $row) => $this->pick($row, $columns),
            $chunk
        );
    }

    private function updateColumns(array $chunk): array
    {
        $columns = [
            'category', 'fitting_type', 'asme_standard', 'connection',
            'nps_main', 'dn_main_mm', 'od_main_mm', 'nps_secondary', 'dn_secondary_mm',
            'od_secondary_mm', 'dimension_primary_mm', 'dimension_secondary_mm',
            'schedule_class', 'wall_mm', 'material_cs', 'material_ss',
            'weight_cs_kg', 'weight_ss_kg', 'status', 'source_reference',
        ];

        return $this->pick($chunk[0], $columns);
    }

    private function pick(array $row, array $columns): array
    {
        $out = [];
        foreach ($columns as $col) {
            $out[$col] = $row[$col] ?? null;
        }

        return $out;
    }
}
