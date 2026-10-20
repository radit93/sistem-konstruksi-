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
        Schema::create('inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('joint_id')->nullable()->constrained()->nullOnDelete();$table->string('kind');$table->string('result')->nullable();$table->string('report_no')->nullable();$table->date('insp_date')->nullable();$table->string('inspector')->nullable();$table->string('photo_path')->nullable();$table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inspections');
    }
};
