<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom JSON untuk tracking repair cycle sesuai Excel PCM Piping.xlsx.
     */
    public function up(): void
    {
        Schema::table('inspections', function (Blueprint $table) {
            $table->json('repair_cycle')->nullable()->after('remarks');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inspections', function (Blueprint $table) {
            $table->dropColumn('repair_cycle');
        });
    }
};
