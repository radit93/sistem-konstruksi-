<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Hazard / temuan lapangan. Tiga peran dipisahkan dengan tegas:
     * pelapor (reported_by), PIC (pic_user_id / pic_name), dan verifikator HSE
     * (verified_by). department_id selalu milik HSE supaya temuan yang
     * dilaporkan departemen lain tidak hilang dari layar HSE; departemen
     * pelapor disimpan terpisah di reporter_department_id.
     */
    public function up(): void
    {
        Schema::create('hse_hazards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('hazard_no');
            $table->date('found_date');
            $table->string('location');
            $table->string('category')->default('UNSAFE_CONDITION');
            $table->string('severity')->default('MEDIUM');
            $table->text('description');
            $table->string('photo_before')->nullable();

            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('pic_name')->nullable();
            $table->string('pic_company')->nullable();
            $table->foreignId('pic_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->text('corrective_action')->nullable();
            $table->string('photo_after')->nullable();

            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('verified_at')->nullable();
            $table->text('verification_note')->nullable();
            $table->string('status')->default('OPEN');

            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reporter_name')->nullable();
            $table->string('reporter_company')->nullable();
            $table->foreignId('reporter_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->boolean('is_anonymous')->default(false);

            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();

            $table->unique('hazard_no');
            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'due_date']);
            $table->index('pic_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hse_hazards');
    }
};
