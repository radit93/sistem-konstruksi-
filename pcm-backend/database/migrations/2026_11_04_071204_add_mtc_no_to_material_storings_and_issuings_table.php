<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_storings', function (Blueprint $table): void {
            $table->string('mtc_no', 64)->nullable()->after('heat_no')->index();
        });

        Schema::table('material_issuings', function (Blueprint $table): void {
            $table->string('mtc_no', 64)->nullable()->after('heat_no')->index();
        });
    }

    public function down(): void
    {
        Schema::table('material_issuings', function (Blueprint $table): void {
            $table->dropIndex(['mtc_no']);
            $table->dropColumn('mtc_no');
        });

        Schema::table('material_storings', function (Blueprint $table): void {
            $table->dropIndex(['mtc_no']);
            $table->dropColumn('mtc_no');
        });
    }
};
