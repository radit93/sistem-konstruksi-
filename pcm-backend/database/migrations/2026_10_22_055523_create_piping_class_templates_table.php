<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piping_class_templates', function (Blueprint $table) {
            $table->id();
            $table->string('piping_class', 64)->index(); // A1A, A2A, dll
            $table->string('component_type', 64); // Pipe, Elbow 90 LR, Flange WN, Gasket, Stud Bolt
            $table->string('description', 255);
            $table->string('default_rating_sch', 32)->nullable();
            $table->string('material_spec', 128);
            $table->foreignId('material_standard_id')->nullable()->constrained('material_standards')->nullOnDelete();
            $table->string('unit', 32)->default('buah');
            $table->decimal('ratio_formula', 10, 4)->default(1.0000); // Rasio per DI atau per joint
            $table->string('basis', 32)->default('PER_JOINT'); // PER_JOINT, PER_DI, FIXED
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piping_class_templates');
    }
};
