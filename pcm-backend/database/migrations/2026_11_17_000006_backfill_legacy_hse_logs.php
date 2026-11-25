<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Log HSE lama dibuat sebelum kolom project_id ada, sehingga tidak muncul
     * di layar HSE yang selalu difilter per project. Bila database hanya punya
     * satu project, kepemilikan baris lama tidak ambigu dan bisa diisi tanpa
     * menebak. Database dengan banyak project sengaja dibiarkan apa adanya:
     * admin yang memilih project untuk setiap baris.
     */
    public function up(): void
    {
        if (! Schema::hasTable('projects') || ! Schema::hasTable('hse_logs')) {
            return;
        }

        if (DB::table('projects')->count() !== 1) {
            return;
        }

        $project = DB::table('projects')->select('id', 'job_no')->first();

        $legacyIds = DB::table('hse_logs')
            ->whereNull('project_id')
            ->orderBy('id')
            ->pluck('id');

        if ($legacyIds->isEmpty()) {
            return;
        }

        $prefix = 'HSE-'.($project->job_no ?: 'PROJECT').'-';
        $sequence = (int) DB::table('hse_logs')
            ->where('log_no', 'like', $prefix.'%')
            ->count();

        foreach ($legacyIds as $id) {
            $sequence++;

            DB::table('hse_logs')->where('id', $id)->update([
                'project_id' => $project->id,
                'log_no' => $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
            ]);
        }
    }

    public function down(): void
    {
        // Data lama tidak dikembalikan ke keadaan yatim.
    }
};
