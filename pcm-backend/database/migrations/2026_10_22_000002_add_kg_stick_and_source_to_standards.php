<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pipe_standards', function (Blueprint $table) {
            if (!Schema::hasColumn('pipe_standards', 'standard_length_m')) {
                $table->decimal('standard_length_m', 5, 2)->default(6.00)->after('weight_kg_m');
            }
            if (!Schema::hasColumn('pipe_standards', 'weight_kg_stick')) {
                $table->decimal('weight_kg_stick', 10, 2)->nullable()->after('standard_length_m');
            }
            if (!Schema::hasColumn('pipe_standards', 'source')) {
                $table->string('source', 80)->nullable()->after('weight_kg_stick');
            }
            if (!Schema::hasColumn('pipe_standards', 'is_interim')) {
                $table->boolean('is_interim')->default(false)->after('source');
            }
        });

        Schema::table('material_standards', function (Blueprint $table) {
            if (!Schema::hasColumn('material_standards', 'source')) {
                $table->string('source', 80)->nullable()->after('description');
            }
            if (!Schema::hasColumn('material_standards', 'is_interim')) {
                $table->boolean('is_interim')->default(false)->after('source');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pipe_standards', function (Blueprint $table) {
            foreach (['is_interim', 'source', 'weight_kg_stick', 'standard_length_m'] as $column) {
                if (Schema::hasColumn('pipe_standards', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('material_standards', function (Blueprint $table) {
            foreach (['is_interim', 'source'] as $column) {
                if (Schema::hasColumn('material_standards', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
