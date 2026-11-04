<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The dashboard reports project cost in Indonesian Rupiah. Existing rows
     * were seeded with the old USD label, so relabel them as well.
     */
    public function up(): void
    {
        Schema::table('budget_items', function (Blueprint $table) {
            $table->string('currency', 16)->default('IDR')->change();
        });

        DB::table('budget_items')
            ->where('currency', 'USD')
            ->update(['currency' => 'IDR']);
    }

    public function down(): void
    {
        DB::table('budget_items')
            ->where('currency', 'IDR')
            ->update(['currency' => 'USD']);

        Schema::table('budget_items', function (Blueprint $table) {
            $table->string('currency', 16)->default('USD')->change();
        });
    }
};
