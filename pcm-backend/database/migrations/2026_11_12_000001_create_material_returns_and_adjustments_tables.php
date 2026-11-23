<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_returns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('projects');
            $table->foreignId('material_issuing_id')->constrained('material_issuings');
            $table->foreignId('material_storing_id')->constrained('material_storings');
            $table->string('return_no', 64)->unique();
            $table->decimal('qty', 12, 2);
            $table->string('unit', 32);
            $table->string('condition', 32)->default('GOOD');
            $table->text('reason')->nullable();
            $table->string('status', 32)->default('APPLIED');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('material_adjustments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('projects');
            $table->foreignId('material_storing_id')->constrained('material_storings');
            $table->string('adjustment_no', 64)->unique();
            $table->decimal('qty_delta', 12, 2);
            $table->decimal('balance_before', 12, 2);
            $table->decimal('balance_after', 12, 2)->nullable();
            $table->string('reason', 128);
            $table->text('notes')->nullable();
            $table->string('status', 32)->default('PENDING');
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_adjustments');
        Schema::dropIfExists('material_returns');
    }
};
