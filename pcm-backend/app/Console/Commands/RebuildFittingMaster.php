<?php

namespace App\Console\Commands;

use App\Models\FittingStandard;
use App\Models\MaterialStandard;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RebuildFittingMaster extends Command
{
    protected $signature = 'db:rebuild-fitting-master {--keep-fit-material : Pertahankan material_standards FIT-*}';

    protected $description = 'Idempotent rebuild master fitting: truncate+seeding fitting_standards dari JSON canonical, bersihkan material_standards FIT-*';

    public function handle(): int
    {
        $started = microtime(true);

        // 1. Refresh fitting_standards dari JSON canonical
        $this->info('Menyediakan fitting_standards dari database/data/fitting_master_asme.json ...');
        DB::table('fitting_standards')->truncate();
        $this->call('db:seed', ['--class' => 'Database\Seeders\FittingStandardSeeder']);
        $count = FittingStandard::count();
        $this->info("fitting_standards: {$count} baris");

        // 2. Bersihkan material_standards FIT-* (idempotent, hanya bila tidak di-flag)
        if ($this->option('keep-fit-material')) {
            $this->warn('FIT-* material_standards dipertahankan (--keep-fit-material).');
        } else {
            $deleted = DB::table('material_standards')
                ->where('code', 'like', 'FIT-%')
                ->delete();
            $this->info("material_standards FIT-* dihapus: {$deleted} baris");
        }

        $this->info('Selesai dalam '.round(microtime(true) - $started, 2).' dtk.');
        return self::SUCCESS;
    }
}
