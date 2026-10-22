<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('drawings', 'fitup_specs')) {
            Schema::table('drawings', function (Blueprint $table) {
                $table->json('fitup_specs')->nullable()->after('material_spec');
            });
        }

        if (!Schema::hasTable('pipe_standards')) {
            Schema::create('pipe_standards', function (Blueprint $table) {
                $table->id();
                $table->string('nps', 32)->index(); // Diameter pipa nominal (NPS): 1/2", 1", 2", 4", etc.
                $table->string('dn', 32)->nullable(); // Diameter Nominal (DN): DN 15, DN 50, etc.
                $table->decimal('outer_diameter_mm', 8, 2)->nullable();
                $table->string('schedule', 32)->index(); // Thickness / Schedule: Sch 10, Sch 40, Sch 80, etc.
                $table->decimal('wall_thickness_mm', 8, 2)->nullable();
                $table->decimal('weight_kg_m', 8, 2)->nullable(); // Berat pipa (kg/m)
                $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pipe_standards');
        if (Schema::hasColumn('drawings', 'fitup_specs')) {
            Schema::table('drawings', function (Blueprint $table) {
                $table->dropColumn('fitup_specs');
            });
        }
    }
};
