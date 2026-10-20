<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Project Milestones (Hold points & Phase gates)
        Schema::create('project_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('code', 32)->index();
            $table->string('name', 255);
            $table->string('phase', 64)->default('Project Execution'); // Engineering, Procurement, Fabrication, Erection, Testing, Handover
            $table->date('target_date')->nullable();
            $table->date('actual_date')->nullable();
            $table->decimal('weight_pct', 5, 2)->default(0);
            $table->string('status', 32)->default('PENDING'); // PENDING, IN_PROGRESS, COMPLETED, DELAYED
            $table->boolean('is_hold_point')->default(false);
            $table->string('pic_lead', 128)->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Budget Items (Budget VS Progress breakdown: Labor, Equipment, Tool & Consumables)
        Schema::create('budget_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('item_code', 64)->index();
            $table->string('category', 64)->default('Direct Cost'); // Direct Cost, Indirect Cost
            $table->string('scope_description', 255);
            $table->string('unit', 32)->default('DI');
            $table->decimal('contract_qty', 14, 2)->default(0);
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('labor_cost', 14, 2)->default(0);
            $table->decimal('equipment_cost', 14, 2)->default(0);
            $table->decimal('consumable_cost', 14, 2)->default(0);
            $table->decimal('total_budget', 14, 2)->default(0);
            $table->decimal('actual_cost', 14, 2)->default(0);
            $table->string('currency', 16)->default('USD');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_items');
        Schema::dropIfExists('project_milestones');
    }
};
