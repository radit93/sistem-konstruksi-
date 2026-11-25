<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Test Package sebelumnya hanya header: tidak terikat project dan tidak
     * tahu joint mana yang diuji. Dua hal itu yang membuat "paket" bisa
     * dihitung kesiapannya, jadi keduanya ditambahkan di sini.
     */
    public function up(): void
    {
        Schema::table('test_packages', function (Blueprint $table) {
            $table->foreignId('project_id')
                ->nullable()
                ->after('department_id')
                ->constrained()
                ->nullOnDelete();
        });

        // Satu joint hanya boleh berada di satu paket uji pada satu waktu,
        // karena joint yang sama tidak bisa diuji dua kali bersamaan.
        Schema::create('joint_test_package', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_package_id')->constrained()->cascadeOnDelete();
            $table->foreignId('joint_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['test_package_id', 'joint_id']);
            $table->index('joint_id');
        });

        // Baris lama belum punya project. Kalau database hanya punya satu
        // project, paket lama jelas milik project itu; kalau lebih dari satu,
        // dibiarkan kosong supaya tidak menebak salah pemilik.
        if (DB::table('projects')->count() === 1) {
            DB::table('test_packages')
                ->whereNull('project_id')
                ->update(['project_id' => DB::table('projects')->value('id')]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('joint_test_package');

        Schema::table('test_packages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
        });
    }
};
