<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('engineering_boqs', function (Blueprint $table) {
            if (! Schema::hasColumn('engineering_boqs', 'rate_per_di')) {
                $table->decimal('rate_per_di', 12, 2)->default(0)->after('dia_inch_total');
            }
            if (! Schema::hasColumn('engineering_boqs', 'welding_cost_total')) {
                $table->decimal('welding_cost_total', 14, 2)->default(0)->after('weight_kg');
            }
            if (! Schema::hasColumn('engineering_boqs', 'total_amount')) {
                $table->decimal('total_amount', 14, 2)->default(0)->after('welding_cost_total');
            }
        });

        Schema::table('bill_of_materials', function (Blueprint $table) {
            if (! Schema::hasColumn('bill_of_materials', 'unit_price')) {
                $table->decimal('unit_price', 14, 2)->default(0)->after('unit');
            }
            if (! Schema::hasColumn('bill_of_materials', 'total_price')) {
                $table->decimal('total_price', 14, 2)->default(0)->after('unit_price');
            }
        });
    }

    public function down(): void
    {
        Schema::table('engineering_boqs', function (Blueprint $table) {
            $cols = ['rate_per_di', 'welding_cost_total', 'total_amount'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('engineering_boqs', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('bill_of_materials', function (Blueprint $table) {
            $cols = ['unit_price', 'total_price'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('bill_of_materials', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
