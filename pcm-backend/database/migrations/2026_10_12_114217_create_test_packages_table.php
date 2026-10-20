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
        Schema::create('test_packages', function (Blueprint $table) {
            $table->id();
            $table->string('pkg_no');$table->string('line_no')->nullable();$table->string('test_kind')->default('Hydro');$table->date('schedule_date')->nullable();$table->string('status')->default('planned');$table->text('blinds')->nullable();$table->boolean('reinstated')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('test_packages');
    }
};
