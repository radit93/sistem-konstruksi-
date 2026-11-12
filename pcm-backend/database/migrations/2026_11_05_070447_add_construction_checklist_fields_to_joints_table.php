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
            $table->string('fitup_alignment')->nullable();
            $table->string('fitup_root_gap')->nullable();
            $table->string('fitup_bevel')->nullable();
            $table->string('fitup_hi_low')->nullable();
            $table->string('fitup_tack_weld')->nullable();
            $table->string('fitup_inspector')->nullable();
            $table->date('fitup_inspection_date')->nullable();
            $table->string('welding_process')->nullable();
            $table->string('filler_material')->nullable();
            $table->string('preheat')->nullable();
            $table->string('interpass_temperature')->nullable();
            $table->string('construction_remarks')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('joints', function (Blueprint $table) {
            $table->dropColumn([
                'fitup_alignment', 'fitup_root_gap', 'fitup_bevel', 'fitup_hi_low',
                'fitup_tack_weld', 'fitup_inspector', 'fitup_inspection_date',
                'welding_process', 'filler_material', 'preheat',
                'interpass_temperature', 'construction_remarks',
            ]);
        });
    }
};
