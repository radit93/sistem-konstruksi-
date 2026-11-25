<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom JSON untuk tracking repair cycle sesuai Excel PCM Piping.xlsx.
     *
     * Migrasi ini bertanggal 2024 sehingga pada instalasi baru berjalan sebelum
     * tabel inspections dibuat. Guard di bawah menjaga urutan itu tetap aman;
     * migrasi 2026_11_05_053619 menjadi tempat penambahan kolom bila tabel baru
     * ada setelah migrasi ini.
     */
    public function up(): void
    {
        if (! Schema::hasTable('inspections') || Schema::hasColumn('inspections', 'repair_cycle')) {
            return;
        }

        Schema::table('inspections', function (Blueprint $table) {
            $table->json('repair_cycle')->nullable()->after('remarks');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('inspections') || ! Schema::hasColumn('inspections', 'repair_cycle')) {
            return;
        }

        Schema::table('inspections', function (Blueprint $table) {
            $table->dropColumn('repair_cycle');
        });
    }
};
