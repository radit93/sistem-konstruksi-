<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pada database lama kolom repair_cycle sudah dibuat oleh migrasi 2024.
     * Pada instalasi baru migrasi 2024 berjalan sebelum tabel inspections ada,
     * sehingga kolom ditambahkan di sini setelah tabelnya tersedia.
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
        // Kolom dimiliki oleh migrasi 2024; jangan dihapus dua kali.
    }
};
