<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_vendors', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 160);
            $table->string('contact', 120)->nullable();
            $table->string('email', 160)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('material_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 100);
            $table->string('default_unit', 32)->default('pcs');
            $table->boolean('requires_heat_no')->default(false);
            $table->boolean('requires_mtc')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('material_units', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 16)->unique();
            $table->string('name', 64);
            $table->unsignedTinyInteger('decimal_precision')->default(2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('material_locations', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name', 128);
            $table->string('storage_type', 32)->default('WAREHOUSE');
            $table->string('area', 64)->nullable();
            $table->string('zone', 64)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        DB::table('material_categories')->insert([
            ['code'=>'PIPE','name'=>'Pipe','default_unit'=>'meter','requires_heat_no'=>true,'requires_mtc'=>true,'is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'FITTING','name'=>'Fitting','default_unit'=>'pcs','requires_heat_no'=>true,'requires_mtc'=>true,'is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'FLANGE','name'=>'Flange','default_unit'=>'pcs','requires_heat_no'=>true,'requires_mtc'=>true,'is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'VALVE','name'=>'Valve','default_unit'=>'pcs','requires_heat_no'=>false,'requires_mtc'=>true,'is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'GASKET','name'=>'Gasket','default_unit'=>'pcs','requires_heat_no'=>false,'requires_mtc'=>false,'is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'FASTENER','name'=>'Fastener','default_unit'=>'pcs','requires_heat_no'=>false,'requires_mtc'=>false,'is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'CONSUMABLE','name'=>'Consumable','default_unit'=>'pcs','requires_heat_no'=>false,'requires_mtc'=>false,'is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
        ]);
        DB::table('material_units')->insert(array_map(fn ($code, $name) => ['code'=>$code,'name'=>$name,'decimal_precision'=>2,'is_active'=>true,'created_at'=>now(),'updated_at'=>now()], ['M','PCS','KG','SET','BOX','DRUM'], ['Meter','Pieces','Kilogram','Set','Box','Drum']));
        DB::table('material_locations')->insert([
            ['code'=>'WH-DEFAULT','name'=>'Warehouse Default','storage_type'=>'WAREHOUSE','area'=>'MAIN','zone'=>'A','is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'OY-DEFAULT','name'=>'Open Yard Default','storage_type'=>'OPEN_YARD','area'=>'LAYDOWN','zone'=>'A','is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'QH-DEFAULT','name'=>'Quarantine Area','storage_type'=>'QUARANTINE','area'=>'QC','zone'=>'A','is_active'=>true,'created_at'=>now(),'updated_at'=>now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('material_locations');
        Schema::dropIfExists('material_units');
        Schema::dropIfExists('material_categories');
        Schema::dropIfExists('material_vendors');
    }
};
