<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('scopes', 'project_id')) {
            Schema::table('scopes', function (Blueprint $table) {
                $table->foreignId('project_id')->nullable()->after('id')->constrained('projects')->nullOnDelete();
            });

            // Set existing scopes to project 1 (Job 2428)
            $firstProjectId = DB::table('projects')->where('job_no', '2428')->value('id')
                ?? DB::table('projects')->value('id');
            if ($firstProjectId) {
                DB::table('scopes')->whereNull('project_id')->update(['project_id' => $firstProjectId]);
            }
        }

        if (!Schema::hasColumn('daily_progress', 'project_id')) {
            Schema::table('daily_progress', function (Blueprint $table) {
                $table->foreignId('project_id')->nullable()->after('id')->constrained('projects')->nullOnDelete();
            });

            $firstProjectId = DB::table('projects')->where('job_no', '2428')->value('id')
                ?? DB::table('projects')->value('id');
            if ($firstProjectId) {
                DB::table('daily_progress')->whereNull('project_id')->update(['project_id' => $firstProjectId]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('daily_progress', 'project_id')) {
            Schema::table('daily_progress', function (Blueprint $table) {
                $table->dropForeign(['project_id']);
                $table->dropColumn('project_id');
            });
        }

        if (Schema::hasColumn('scopes', 'project_id')) {
            Schema::table('scopes', function (Blueprint $table) {
                $table->dropForeign(['project_id']);
                $table->dropColumn('project_id');
            });
        }
    }
};
