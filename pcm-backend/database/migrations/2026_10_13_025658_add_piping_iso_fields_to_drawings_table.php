<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drawings', function (Blueprint $table) {
            $table->decimal('total_dia_inch', 10, 2)->nullable()->after('rev');
            $table->unsignedInteger('total_joints')->nullable()->after('total_dia_inch');
            $table->string('line_service')->nullable()->after('line_no');
            $table->string('material_spec')->nullable()->after('line_service');
            $table->string('size_range')->nullable()->after('material_spec');
            $table->string('distributed_to')->nullable()->after('scan_path');
            $table->date('distribution_date')->nullable()->after('distributed_to');
        });
    }

    public function down(): void
    {
        Schema::table('drawings', function (Blueprint $table) {
            $table->dropColumn([
                'total_dia_inch',
                'total_joints',
                'line_service',
                'material_spec',
                'size_range',
                'distributed_to',
                'distribution_date',
            ]);
        });
    }
};
