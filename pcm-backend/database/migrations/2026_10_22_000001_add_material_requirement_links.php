<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Engineering BOM/MTO dipetakan ke katalog standar material supaya
        // Material Control bisa mencocokkan requirement dengan stok nyata.
        Schema::table('bill_of_materials', function (Blueprint $table) {
            $table->foreignId('material_standard_id')
                ->nullable()
                ->after('material_spec')
                ->constrained('material_standards')
                ->nullOnDelete();
        });

        Schema::table('material_receivings', function (Blueprint $table) {
            $table->foreignId('material_standard_id')
                ->nullable()
                ->after('category')
                ->constrained('material_standards')
                ->nullOnDelete();
        });

        Schema::table('material_storings', function (Blueprint $table) {
            $table->foreignId('material_standard_id')
                ->nullable()
                ->after('category')
                ->constrained('material_standards')
                ->nullOnDelete();
        });

        // Issuing membawa link ke drawing dan baris BOM, sehingga rekonsiliasi
        // required vs issued bisa dihitung per spool tanpa menebak dari teks.
        Schema::table('material_issuings', function (Blueprint $table) {
            $table->foreignId('drawing_id')
                ->nullable()
                ->after('project_id')
                ->constrained('drawings')
                ->nullOnDelete();
            $table->foreignId('bom_id')
                ->nullable()
                ->after('drawing_id')
                ->constrained('bill_of_materials')
                ->nullOnDelete();
            $table->foreignId('material_standard_id')
                ->nullable()
                ->after('material_storing_id')
                ->constrained('material_standards')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('material_issuings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('material_standard_id');
            $table->dropConstrainedForeignId('bom_id');
            $table->dropConstrainedForeignId('drawing_id');
        });

        Schema::table('material_storings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('material_standard_id');
        });

        Schema::table('material_receivings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('material_standard_id');
        });

        Schema::table('bill_of_materials', function (Blueprint $table) {
            $table->dropConstrainedForeignId('material_standard_id');
        });
    }
};
