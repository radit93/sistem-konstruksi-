<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('joints', function (Blueprint $table) {
            $table->string('repair_no')->nullable();
            $table->string('repair_defect')->nullable();
            $table->string('repair_method')->nullable();
            $table->string('repair_welder')->nullable();
            $table->date('repair_date')->nullable();
            $table->text('repair_remarks')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('joints', function (Blueprint $table) {
            $table->dropColumn(['repair_no', 'repair_defect', 'repair_method', 'repair_welder', 'repair_date', 'repair_remarks']);
        });
    }
};
