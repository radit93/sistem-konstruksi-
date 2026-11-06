<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fitting_standards', function (Blueprint $table) {
            $table->id();
            $table->string('item_code', 64)->unique();
            $table->string('category', 64)->index();
            $table->string('fitting_type', 128);
            $table->string('asme_standard', 64)->nullable();
            $table->string('connection', 64)->nullable();
            $table->string('nps_main', 24)->nullable()->index();
            $table->unsignedSmallInteger('dn_main_mm')->nullable();
            $table->decimal('od_main_mm', 8, 2)->nullable();
            $table->string('nps_secondary', 24)->nullable();
            $table->unsignedSmallInteger('dn_secondary_mm')->nullable();
            $table->decimal('od_secondary_mm', 8, 2)->nullable();
            $table->decimal('dimension_primary_mm', 8, 2)->nullable();
            $table->decimal('dimension_secondary_mm', 8, 2)->nullable();
            $table->string('schedule_class', 32)->nullable()->index();
            $table->decimal('wall_mm', 8, 2)->nullable();
            $table->string('material_cs', 128)->nullable();
            $table->string('material_ss', 128)->nullable();
            $table->decimal('weight_cs_kg', 10, 3)->nullable();
            $table->decimal('weight_ss_kg', 10, 3)->nullable();
            $table->string('status', 24)->default('ACTIVE')->index();
            $table->text('source_reference')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fitting_standards');
    }
};
