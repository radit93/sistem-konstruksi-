<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kunci unik system_parameters dipindah dari (category, name) ke (category, code).
 *
 * Alasan: parameter berjenis "material_attribute" memakai `code` sebagai nama
 * kategori material (Pipe, Fitting, Flange, ...) dan `name` sebagai label kolom.
 * Pipe dan Fitting sama-sama berlabel "Sch", sehingga kunci (category, name)
 * membuat keduanya bertabrakan dan salah satunya hilang.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_parameters', function (Blueprint $table) {
            $table->dropUnique(['category', 'name']);
            $table->unique(['category', 'code']);
        });
    }

    public function down(): void
    {
        Schema::table('system_parameters', function (Blueprint $table) {
            $table->dropUnique(['category', 'code']);
            $table->unique(['category', 'name']);
        });
    }
};
