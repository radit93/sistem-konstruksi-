<?php

use App\Support\AccessCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 64)->default('construction')->change();
            $table->unsignedBigInteger('department_id')->nullable()->after('role');
            $table->boolean('is_active')->default(true)->after('department_id');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
        });

        // Role rename: manager -> project_manager. Must happen before the
        // foreign key exists, otherwise the old value has no parent row.
        DB::table('users')->where('role', 'manager')->update(['role' => 'project_manager']);

        // Any stray role value would break the foreign key below.
        $known = DB::table('roles')->pluck('code')->all();
        DB::table('users')->whereNotIn('role', $known)->update(['role' => 'construction']);

        // Every existing user gets the department that owns their role. A user
        // with no department is treated as "sees nothing" at query time, never
        // as "sees everything", so this backfill is what keeps the app usable.
        $departments = DB::table('departments')->pluck('id', 'code');
        foreach (AccessCatalog::roleDepartment() as $roleCode => $departmentCode) {
            if (isset($departments[$departmentCode])) {
                DB::table('users')
                    ->where('role', $roleCode)
                    ->update(['department_id' => $departments[$departmentCode]]);
            }
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('role')->references('code')->on('roles')
                ->cascadeOnUpdate()->restrictOnDelete();
            $table->foreign('department_id')->references('id')->on('departments')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropForeign(['role']);
            $table->dropColumn(['department_id', 'is_active', 'last_login_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('construction')->change();
        });

        DB::table('users')->where('role', 'project_manager')->update(['role' => 'manager']);
    }
};
