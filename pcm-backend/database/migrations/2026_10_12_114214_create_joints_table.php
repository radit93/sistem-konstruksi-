<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('joints', function (Blueprint $table) {
            $table->id();
            $table->string('drawing_no');$table->string('line_no')->nullable();$table->string('spool_no')->nullable();$table->unsignedInteger('seq')->nullable();$table->string('item_a')->nullable();$table->string('spec_a')->nullable();$table->string('item_b')->nullable();$table->string('spec_b')->nullable();$table->decimal('size_in',8,2)->nullable();$table->string('shop_field')->default('Shop');$table->string('joint_type')->nullable();$table->string('method')->nullable();$table->string('wps')->nullable();$table->string('welder')->nullable();$table->date('fit_date')->nullable();$table->date('weld_date')->nullable();$table->string('visual')->nullable();$table->string('status')->default('FITUP_OK');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('joints');
    }
};
