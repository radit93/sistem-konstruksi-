<?php

namespace Database\Seeders;

use App\Support\AccessCatalog;
use Illuminate\Database\Seeder;

/**
 * Idempotent. Re-running it restores the shipped catalog for departments,
 * roles, permissions and the role/permission matrix. Running it after the
 * migration is harmless: the migration already installed the same rows.
 */
class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        AccessCatalog::install();
    }
}
