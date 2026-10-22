<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('welding_maps', 'length_mm')) {
            Schema::table('welding_maps', function (Blueprint $table) {
                // Panjang segmen pipa per joint, dalam milimeter.
                $table->decimal('length_mm', 12, 2)->nullable()->after('thickness');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('welding_maps', 'length_mm')) {
            Schema::table('welding_maps', function (Blueprint $table) {
                $table->dropColumn('length_mm');
            });
        }
    }
};
