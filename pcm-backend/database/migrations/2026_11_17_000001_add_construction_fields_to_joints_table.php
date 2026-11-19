<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom yang dibutuhkan modul Construction:
     * - project_id      : joint selama ini hanya terikat ke drawing_no, sehingga filter
     *                     per project di Construction/QAQC tidak pernah cocok.
     * - erection_type   : jenis pekerjaan lapangan (SHOP_WELD, FILL_WELD, ASSEMBLY, BOLTED).
     * - repair_cycle    : hitungan repair per joint (maksimal 2 sebelum cut-out).
     */
    public function up(): void
    {
        Schema::table('joints', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('id')->constrained('projects')->nullOnDelete();
            $table->string('erection_type', 32)->nullable()->after('joint_type');
            $table->unsignedTinyInteger('repair_cycle')->default(1)->after('repair_status');
            $table->index(['project_id', 'shop_field'], 'joints_project_shop_field_index');
        });

        // Backfill project dari drawing pemilik joint.
        DB::statement('
            UPDATE joints j
            INNER JOIN drawings d ON d.drawing_no = j.drawing_no
            SET j.project_id = d.project_id
            WHERE j.project_id IS NULL
        ');

        // Joint lama belum punya jenis pekerjaan; turunkan dari lokasinya.
        DB::statement("
            UPDATE joints
            SET erection_type = CASE WHEN LOWER(shop_field) = 'shop' THEN 'SHOP_WELD' ELSE 'FILL_WELD' END
            WHERE erection_type IS NULL
        ");

        // Verdict fit-up lama "NOK" diganti "ENGINEER" (eskalasi ke Engineering).
        foreach ([
            'fitup_alignment', 'fitup_root_gap', 'fitup_bevel', 'fitup_hi_low', 'fitup_tack_weld',
        ] as $column) {
            DB::table('joints')->where($column, 'NOK')->update([$column => 'ENGINEER']);
        }
    }

    public function down(): void
    {
        Schema::table('joints', function (Blueprint $table) {
            $table->dropIndex('joints_project_shop_field_index');
            $table->dropForeign(['project_id']);
            $table->dropColumn(['project_id', 'erection_type', 'repair_cycle']);
        });
    }
};
