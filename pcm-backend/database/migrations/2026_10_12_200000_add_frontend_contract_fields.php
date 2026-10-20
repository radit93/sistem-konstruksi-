<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ponytail: kolom nullable tambahan agar form frontend tersimpan utuh (tanpa ini POST /stock,/inspections,/test-packages 500);
// hapus via migrate:rollback bila frontend disederhanakan.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_moves', function (Blueprint $table) {
            $table->string('size')->nullable()->after('spec');
            $table->string('heat_no')->nullable()->after('location');
            $table->string('po_no')->nullable()->after('heat_no');
        });
        Schema::table('inspections', function (Blueprint $table) {
            $table->string('defect_type')->nullable()->after('result');
        });
        Schema::table('test_packages', function (Blueprint $table) {
            $table->string('system_name')->nullable()->after('pkg_no');
            $table->decimal('test_pressure_bar', 10, 2)->nullable()->after('test_kind');
            $table->unsignedInteger('holding_time_min')->nullable()->after('test_pressure_bar');
            $table->unsignedInteger('punch_list_open')->nullable()->after('status');
            $table->boolean('blinds_installed')->nullable()->after('blinds');
        });
        Schema::table('hse_logs', function (Blueprint $table) {
            $table->text('action_taken')->nullable()->after('description');
        });
        Schema::table('scopes', function (Blueprint $table) {
            $table->decimal('cumulative_qty', 14, 2)->nullable()->default(0)->after('contract_qty');
        });
    }

    public function down(): void
    {
        Schema::table('stock_moves', function (Blueprint $table) {
            $table->dropColumn(['size', 'heat_no', 'po_no']);
        });
        Schema::table('inspections', function (Blueprint $table) {
            $table->dropColumn('defect_type');
        });
        Schema::table('test_packages', function (Blueprint $table) {
            $table->dropColumn(['system_name', 'test_pressure_bar', 'holding_time_min', 'punch_list_open', 'blinds_installed']);
        });
        Schema::table('hse_logs', function (Blueprint $table) {
            $table->dropColumn('action_taken');
        });
        Schema::table('scopes', function (Blueprint $table) {
            $table->dropColumn('cumulative_qty');
        });
    }
};
