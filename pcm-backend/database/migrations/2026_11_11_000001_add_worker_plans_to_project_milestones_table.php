<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_milestones', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('project_id')->constrained('users')->nullOnDelete();
            $table->string('project_role', 64)->nullable()->after('user_id');
            $table->date('start_date')->nullable()->after('phase');
            $table->unsignedInteger('estimated_days')->nullable()->after('actual_date');
            $table->decimal('work_hours_per_day', 4, 1)->default(8)->after('estimated_days');
        });

        Schema::create('milestone_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_milestone_id')->constrained('project_milestones')->cascadeOnDelete();
            $table->unsignedInteger('day_number')->default(1);
            $table->date('work_date')->nullable();
            $table->string('time_start', 8);
            $table->string('time_end', 8);
            $table->string('activity', 255);
            $table->string('target_output', 120)->nullable();
            $table->boolean('is_done')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['project_milestone_id', 'day_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('milestone_activities');

        Schema::table('project_milestones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['project_role', 'start_date', 'estimated_days', 'work_hours_per_day']);
        });
    }
};
