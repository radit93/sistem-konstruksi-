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
        Schema::create('hse_logs', function (Blueprint $table) {
            $table->id();
            $table->date('log_date')->nullable();$table->string('kind');$table->text('description')->nullable();$table->string('status')->default('open');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hse_logs');
    }
};
