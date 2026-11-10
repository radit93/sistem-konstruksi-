<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Menormalkan kategori material standar: 'Bolt' -> 'Fastener'.
 *
 * Kosakata baku aplikasi adalah 'Fastener' (lihat MaterialSeeder, EngineeringSeeder,
 * dan AutoBomService yang memetakan tipe bolt menjadi 'Fastener'). Data interim
 * sempat memakai 'Bolt' sehingga 2 baris (BOLT-A193-B7, NUT-A194-2H) tidak
 * terjangkau filter kategori di UI.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('material_standards')
            ->where('category', 'Bolt')
            ->update(['category' => 'Fastener']);
    }

    public function down(): void
    {
        // Tidak dikembalikan otomatis: pemisahan ulang Bolt vs Fastener
        // tidak bisa ditentukan tanpa konteks kode material.
    }
};
