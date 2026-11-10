<?php

namespace Database\Seeders;

use App\Models\FittingCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FittingCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/fitting_catalogs_asme.json');

        if (! is_file($path)) {
            $this->command?->error("File katalog fitting tidak ditemukan: {$path}");
            return;
        }

        $items = json_decode(file_get_contents($path), true);

        if (! is_array($items) || empty($items)) {
            $this->command?->warn("Data katalog fitting kosong atau tidak valid.");
            return;
        }

        $this->command?->info("Memulai seeding " . count($items) . " baris katalog fitting ASME...");

        $now = now();
        $chunks = array_chunk($items, 250);

        foreach ($chunks as $chunk) {
            $rows = array_map(function ($row) use ($now) {
                return array_merge($row, [
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }, $chunk);

            FittingCatalog::upsert(
                $rows,
                ['item_code'],
                [
                    'category', 'fitting_type', 'asme_standard', 'connection',
                    'nps_primary', 'dn_primary_mm', 'od_primary_mm',
                    'nps_secondary', 'dn_secondary_mm', 'od_secondary_mm',
                    'dimension_primary_mm', 'dimension_secondary_mm',
                    'schedule_class', 'wall_thickness_mm',
                    'material_cs_spec', 'material_ss_spec',
                    'weight_cs_kg', 'weight_ss_kg',
                    'status', 'source_reference', 'updated_at'
                ]
            );
        }

        $this->command?->info("Seeding katalog fitting ASME selesai: " . FittingCatalog::count() . " item aktif.");
    }
}
