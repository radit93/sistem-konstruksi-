<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Toolbox Meeting (TBM). Jumlah peserta disimpan sebagai angka karena
     * banyak peserta adalah pekerja subcon tanpa akun; daftar nama opsional
     * disimpan sebagai JSON agar tidak memaksa pembuatan akun.
     */
    public function up(): void
    {
        Schema::create('hse_tbm', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->date('tbm_date');
            $table->string('shift')->default('PAGI');
            $table->string('location')->nullable();
            $table->text('topic');
            $table->unsignedInteger('attendees_count')->default(0);
            $table->json('attendee_list')->nullable();
            $table->string('leader_name')->nullable();
            $table->text('notes')->nullable();
            $table->string('photo_path')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'tbm_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hse_tbm');
    }
};
