<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Role "construction" diganti "fabrication". users.role punya foreign key
     * ke roles.code dengan cascadeOnUpdate, jadi rename di sini otomatis
     * mengikuti seluruh akun yang memakai role tersebut.
     */
    public function up(): void
    {
        DB::table('roles')
            ->where('code', 'construction')
            ->update(['code' => 'fabrication', 'name' => 'Fabrication']);

        DB::table('permissions')
            ->where('group_name', 'construction')
            ->update(['group_name' => 'fabrication']);

        DB::table('departments')
            ->where('code', 'CONS')
            ->update(['name' => 'Fabrication']);
    }

    public function down(): void
    {
        DB::table('roles')
            ->where('code', 'fabrication')
            ->update(['code' => 'construction', 'name' => 'Construction']);

        DB::table('permissions')
            ->where('group_name', 'fabrication')
            ->update(['group_name' => 'construction']);

        DB::table('departments')
            ->where('code', 'CONS')
            ->update(['name' => 'Construction']);
    }
};
