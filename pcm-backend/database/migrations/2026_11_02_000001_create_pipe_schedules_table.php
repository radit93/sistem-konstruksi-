<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Master ASME B36.10 pipe schedule (Van Leeuwen 2015-A5-C).
        Schema::create('pipe_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('nominal_size', 16)->index();
            $table->unsignedSmallInteger('nps_mm');
            $table->decimal('od_mm', 8, 2);
            $table->string('schedule', 16)->index();
            $table->decimal('wall_mm', 6, 2);
            $table->decimal('weight_kg_m', 8, 2);
            $table->timestamps();

            $table->unique(['nominal_size', 'schedule']);
        });

        Schema::table('bill_of_materials', function (Blueprint $table) {
            $table->decimal('od_mm', 8, 2)->nullable()->after('qty');
            $table->decimal('wall_mm', 6, 2)->nullable()->after('od_mm');
            $table->decimal('weight_kg', 10, 2)->nullable()->after('wall_mm');
        });

        Schema::table('material_issuings', function (Blueprint $table) {
            $table->string('vendor', 128)->nullable()->after('requestor');
            $table->string('description', 255)->nullable()->after('item_name');
            $table->string('schedule_rating', 32)->nullable()->after('size');
        });
    }

    public function down(): void
    {
        Schema::table('material_issuings', function (Blueprint $table) {
            $table->dropColumn(['vendor', 'description', 'schedule_rating']);
        });

        Schema::table('bill_of_materials', function (Blueprint $table) {
            $table->dropColumn(['od_mm', 'wall_mm', 'weight_kg']);
        });

        Schema::dropIfExists('pipe_schedules');
    }
};
