<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $units = [
            ['code' => 'meter', 'name' => 'Meter', 'sort_order' => 1],
            ['code' => 'pcs', 'name' => 'Pieces', 'sort_order' => 2],
            ['code' => 'kg', 'name' => 'Kilogram', 'sort_order' => 3],
            ['code' => 'set', 'name' => 'Set', 'sort_order' => 4],
            ['code' => 'box', 'name' => 'Box', 'sort_order' => 5],
            ['code' => 'drum', 'name' => 'Drum', 'sort_order' => 6],
        ];

        foreach ($units as $unit) {
            DB::table('system_parameters')->updateOrInsert(
                ['category' => 'material_unit', 'code' => $unit['code']],
                [
                    'name' => $unit['name'],
                    'sort_order' => $unit['sort_order'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }

        Schema::dropIfExists('material_locations');
        Schema::dropIfExists('material_units');
        Schema::dropIfExists('material_categories');
        Schema::dropIfExists('material_vendors');
    }

    public function down(): void
    {
        DB::table('system_parameters')
            ->where('category', 'material_unit')
            ->whereIn('code', ['meter', 'pcs', 'kg', 'set', 'box', 'drum'])
            ->delete();
    }
};
