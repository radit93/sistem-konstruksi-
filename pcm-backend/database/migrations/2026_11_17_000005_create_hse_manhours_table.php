<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Safe man-hours harian: jumlah pekerja x jam kerja per area/kontraktor.
     * Angka inilah yang dipakai KPI, bukan konstanta di frontend.
     */
    public function up(): void
    {
        Schema::create('hse_manhours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->date('work_date');
            $table->string('area')->nullable();
            $table->string('contractor')->nullable();
            $table->unsignedInteger('worker_count')->default(0);
            $table->decimal('work_hours', 5, 2)->default(8);
            $table->decimal('manhours', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'work_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hse_manhours');
    }
};
