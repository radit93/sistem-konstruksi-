<?php

namespace Database\Seeders;

use App\Models\FittingStandard;
use Illuminate\Database\Seeder;

class FittingStandardSeeder extends Seeder
{
    /**
     * Kolom yang ditulis ke fitting_standards, urut sesuai skema.
     *
     * @var list<string>
     */
    private const COLUMNS = [
        'item_code', 'category', 'fitting_type', 'asme_standard', 'connection',
        'nps_main', 'dn_main_mm', 'od_main_mm', 'nps_secondary', 'dn_secondary_mm',
        'od_secondary_mm', 'dimension_primary_mm', 'dimension_secondary_mm',
        'schedule_class', 'wall_mm', 'material_cs', 'material_ss',
        'weight_cs_kg', 'weight_ss_kg', 'status', 'source_reference',
    ];

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

        /** @var list<string> $updateColumns Nama kolom, bukan nilai. */
        $updateColumns = array_values(array_diff(self::COLUMNS, ['item_code']));

        foreach (array_chunk($rows, 500) as $chunk) {
            FittingStandard::upsert(
                $this->toInsertRows($chunk),
                ['item_code'],
                $updateColumns
            );
        }
    }

    /**
     * Baris insert dalam bentuk array kunci => nilai (tanpa id/timestamps,
     * dibiarkan default DB agar upsert tetap ringan).
     *
     * @param  array<int, array<string, mixed>>  $chunk
     * @return array<int, array<string, mixed>>
     */
    private function toInsertRows(array $chunk): array
    {
        return array_map(
            fn (array $row): array => $this->pick($row, self::COLUMNS),
            $chunk
        );
    }

    /**
     * Ambil hanya kolom yang dikenal, dengan nilai null bila tidak tersedia.
     *
     * @param  array<string, mixed>  $row
     * @param  list<string>  $columns
     * @return array<string, mixed>
     */
    private function pick(array $row, array $columns): array
    {
        $out = [];
        foreach ($columns as $col) {
            $out[$col] = $row[$col] ?? null;
        }

        return $out;
    }
}
