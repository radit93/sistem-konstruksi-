<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menyimpan Material Group & Kategori untuk Material A dan B pada Welding Map.
 *
 * Sebelumnya hanya tersimpan item/spec/size/sch. Dengan tambahan ini, laporan
 * bisa dikelompokkan per material group dan form joint bisa memakai cascade
 * dropdown yang konsisten dengan master Material Standart.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('welding_maps', function (Blueprint $table) {
            $table->string('mat_a_group', 64)->nullable()->after('mat_a_spec');
            $table->string('mat_a_category', 64)->nullable()->after('mat_a_group');
            $table->string('mat_b_group', 64)->nullable()->after('mat_b_spec');
            $table->string('mat_b_category', 64)->nullable()->after('mat_b_group');
        });
    }

    public function down(): void
    {
        Schema::table('welding_maps', function (Blueprint $table) {
            $table->dropColumn(['mat_a_group', 'mat_a_category', 'mat_b_group', 'mat_b_category']);
        });
    }
};
