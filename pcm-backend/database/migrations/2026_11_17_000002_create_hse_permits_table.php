<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Permit to Work (PTW). Satu baris = satu izin kerja dengan masa berlaku,
     * pemohon, dan approver HSE. Tanpa izin aktif, pekerjaan berisiko tidak
     * boleh dimulai.
     */
    public function up(): void
    {
        Schema::create('hse_permits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('permit_no');
            $table->string('permit_type');
            $table->string('work_location')->nullable();
            $table->string('line_no')->nullable();
            $table->text('work_scope')->nullable();
            $table->string('applicant_name');
            $table->string('applicant_company')->nullable();
            $table->dateTime('valid_from')->nullable();
            $table->dateTime('valid_to')->nullable();
            $table->string('jsa_ref')->nullable();
            $table->string('status')->default('PENDING');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->string('attachment_path')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('permit_no');
            $table->index(['project_id', 'status']);
            $table->index('valid_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hse_permits');
    }
};
