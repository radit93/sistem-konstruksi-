<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which department owns each operational record. Rows created before
     * department scoping are backfilled with the owning department so the
     * existing data stays visible to the people who work on it.
     */
    private array $owners = [
        'drawings'       => 'ENG',
        'joints'         => 'CONS',
        'stock_moves'    => 'MAT',
        'inspections'    => 'QAQC',
        'test_packages'  => 'QAQC',
        'hse_logs'       => 'HSE',
        'scopes'         => 'PMO',
        'daily_progress' => 'PMO',
    ];

    public function up(): void
    {
        foreach (array_keys($this->owners) as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('department_id')->nullable()->after('id');
                $blueprint->foreign('department_id')->references('id')
                    ->on('departments')->nullOnDelete();
            });
        }

        $departments = DB::table('departments')->pluck('id', 'code');
        foreach ($this->owners as $table => $code) {
            if (isset($departments[$code])) {
                DB::table($table)->update(['department_id' => $departments[$code]]);
            }
        }
    }

    public function down(): void
    {
        foreach (array_keys($this->owners) as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropForeign(['department_id']);
                $blueprint->dropColumn('department_id');
            });
        }
    }
};
