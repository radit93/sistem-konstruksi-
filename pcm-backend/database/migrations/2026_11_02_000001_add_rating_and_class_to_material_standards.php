<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('material_standards')) {
            Schema::table('material_standards', function (Blueprint $table) {
                if (!Schema::hasColumn('material_standards', 'rating')) {
                    $table->string('rating', 32)->nullable()->after('material_group');
                }
                if (!Schema::hasColumn('material_standards', 'class')) {
                    $table->string('class', 32)->nullable()->after('rating');
                }
            });

            // Backfill existing rows dengan nilai rating dan class terpisah
            DB::statement("UPDATE material_standards SET rating = '150# / 300#', class = 'Class 150 / 300' WHERE rating_class LIKE '%150%' AND rating_class LIKE '%300%'");
            DB::statement("UPDATE material_standards SET rating = 'N/A', class = 'N/A' WHERE rating IS NULL");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('material_standards')) {
            Schema::table('material_standards', function (Blueprint $table) {
                if (Schema::hasColumn('material_standards', 'class')) {
                    $table->dropColumn('class');
                }
                if (Schema::hasColumn('material_standards', 'rating')) {
                    $table->dropColumn('rating');
                }
            });
        }
    }
};
