<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_receivings', function (Blueprint $table) {
            $table->string('line_no', 64)->nullable()->after('shipment_no')->index();
            $table->string('category', 64)->nullable()->after('item_name');
            $table->decimal('accepted_qty', 12, 2)->nullable()->after('qty');
            $table->string('packing_type', 64)->nullable()->after('unit');
            $table->timestamp('inspection_requested_at')->nullable()->after('status');
            $table->timestamp('stocked_at')->nullable()->after('accepted_qty');
        });

        Schema::table('material_inspections', function (Blueprint $table) {
            $table->decimal('accepted_qty', 12, 2)->nullable()->after('result');
        });

        Schema::table('material_storings', function (Blueprint $table) {
            $table->foreignId('receiving_id')
                ->nullable()
                ->unique()
                ->after('project_id')
                ->constrained('material_receivings')
                ->nullOnDelete();
            $table->string('line_no', 64)->nullable()->after('item_code');
            $table->string('heat_no', 64)->nullable()->after('line_no')->index();
            $table->string('status', 32)->default('AVAILABLE')->after('balance');
            $table->timestamp('last_movement_at')->nullable()->after('status');
        });

        Schema::table('material_issuings', function (Blueprint $table) {
            $table->foreignId('material_storing_id')
                ->nullable()
                ->after('project_id')
                ->constrained('material_storings')
                ->nullOnDelete();
            $table->string('status', 32)->default('ISSUED')->after('issued_by');
            $table->timestamp('cancelled_at')->nullable()->after('status');
        });

        Schema::create('material_stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('material_storing_id')->constrained('material_storings')->cascadeOnDelete();
            $table->string('type', 32);
            $table->decimal('qty', 12, 2);
            $table->string('unit', 32);
            $table->decimal('balance_after', 12, 2);
            $table->string('reference_type', 64)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('from_location', 128)->nullable();
            $table->string('to_location', 128)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamps();

            $table->index(['material_storing_id', 'occurred_at']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_stock_movements');

        Schema::table('material_issuings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('material_storing_id');
            $table->dropColumn(['status', 'cancelled_at']);
        });

        Schema::table('material_storings', function (Blueprint $table) {
            $table->dropForeign(['receiving_id']);
            $table->dropUnique(['receiving_id']);
            $table->dropColumn(['receiving_id', 'line_no', 'heat_no', 'status', 'last_movement_at']);
        });

        Schema::table('material_inspections', function (Blueprint $table) {
            $table->dropColumn('accepted_qty');
        });

        Schema::table('material_receivings', function (Blueprint $table) {
            $table->dropIndex(['line_no']);
            $table->dropColumn([
                'line_no',
                'category',
                'accepted_qty',
                'packing_type',
                'inspection_requested_at',
                'stocked_at',
            ]);
        });
    }
};
