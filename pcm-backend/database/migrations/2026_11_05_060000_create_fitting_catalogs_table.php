<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fitting_catalogs', function (Blueprint $table) {
            $table->id();
            $table->string('item_code', 64)->unique();
            $table->string('category', 64)->index();
            $table->string('fitting_type', 128)->index();
            $table->string('asme_standard', 64)->index();
            $table->string('connection', 64)->default('Butt-Weld (BW)');
            $table->string('nps_primary', 32)->index();
            $table->unsignedSmallInteger('dn_primary_mm')->nullable();
            $table->decimal('od_primary_mm', 8, 2)->nullable();
            $table->string('nps_secondary', 32)->nullable()->index();
            $table->unsignedSmallInteger('dn_secondary_mm')->nullable();
            $table->decimal('od_secondary_mm', 8, 2)->nullable();
            $table->decimal('dimension_primary_mm', 8, 2)->nullable();
            $table->decimal('dimension_secondary_mm', 8, 2)->nullable();
            $table->string('schedule_class', 32)->nullable()->index();
            $table->decimal('wall_thickness_mm', 6, 2)->nullable();
            $table->string('material_cs_spec', 128)->nullable();
            $table->string('material_ss_spec', 128)->nullable();
            $table->decimal('weight_cs_kg', 10, 3)->nullable();
            $table->decimal('weight_ss_kg', 10, 3)->nullable();
            $table->string('status', 32)->default('ACTIVE')->index();
            $table->text('source_reference')->nullable();
            $table->timestamps();
        });

        Schema::table('bill_of_materials', function (Blueprint $table) {
            $table->foreignId('fitting_catalog_id')
                ->nullable()
                ->after('material_standard_id')
                ->constrained('fitting_catalogs')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bill_of_materials', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fitting_catalog_id');
        });

        Schema::dropIfExists('fitting_catalogs');
    }
};
