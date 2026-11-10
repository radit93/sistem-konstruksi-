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
        Schema::table('drawings', function (Blueprint $table) {
            if (!Schema::hasColumn('drawings', 'total_spools')) {
                $table->unsignedInteger('total_spools')->default(1)->after('total_dia_inch');
            }
            if (!Schema::hasColumn('drawings', 'spool_data')) {
                $table->longText('spool_data')->nullable()->after('total_joints');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('drawings', function (Blueprint $table) {
            if (Schema::hasColumn('drawings', 'spool_data')) {
                $table->dropColumn('spool_data');
            }
            if (Schema::hasColumn('drawings', 'total_spools')) {
                $table->dropColumn('total_spools');
            }
        });
    }
};
