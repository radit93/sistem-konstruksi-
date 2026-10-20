<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Material Receiving (MAT-000 / MAT-006)
        Schema::create('material_receivings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->date('arrival_date');
            $table->string('shipment_no', 64)->index();
            $table->string('po_no', 64)->index();
            $table->string('vendor', 128);
            $table->string('item_name', 128);
            $table->string('description', 255);
            $table->string('specification', 128); // e.g. ASTM A106 Gr. B
            $table->string('size', 32); // e.g. 4"
            $table->string('schedule_rating', 32)->nullable(); // e.g. Sch 40
            $table->string('heat_no', 64)->index();
            $table->string('mtc_no', 64)->nullable();
            $table->decimal('qty', 12, 2)->default(1);
            $table->string('unit', 32)->default('meter');
            $table->string('storage_type', 32)->default('OPEN_YARD'); // WAREHOUSE, OPEN_YARD
            $table->string('storage_location', 64)->default('Laydown Yard A');
            $table->string('status', 32)->default('RECEIVED'); // RECEIVED, INSPECTED, ACCEPTED, REJECTED
            $table->text('remarks')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Material Inspection (MAT-001 / MAT-007)
        Schema::create('material_inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('material_receiving_id')->nullable()->constrained('material_receivings')->nullOnDelete();
            $table->string('report_no', 64)->unique();
            $table->date('inspection_date');
            $table->string('inspector_name', 128);
            $table->string('item_name', 128);
            $table->string('heat_no', 64);
            $table->string('visual_check', 16)->default('PASS'); // PASS, FAIL
            $table->string('dimension_check', 16)->default('PASS'); // PASS, FAIL
            $table->string('mtc_check', 16)->default('PASS'); // PASS, FAIL
            $table->string('result', 32)->default('ACCEPTED'); // ACCEPTED, HOLD, REJECTED
            $table->string('ncr_no', 64)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });

        // 3. Material Storing / Stock Inventory (MAT-002, MAT-003, MAT-004 / MAT-008, MAT-009, MAT-010)
        Schema::create('material_storings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('item_code', 64)->unique();
            $table->string('item_name', 128);
            $table->string('category', 64)->default('PIPE'); // PIPE, FITTING, FLANGE, VALVE, GASKET, FASTENER, CONSUMABLE
            $table->string('specification', 128);
            $table->string('size', 32);
            $table->string('schedule_rating', 32)->nullable();
            $table->string('storage_type', 32)->default('WAREHOUSE'); // WAREHOUSE, OPEN_YARD
            $table->string('location_detail', 128); // e.g. Warehouse Rack B-04 or Laydown Bay 02
            $table->decimal('stock_in', 12, 2)->default(0);
            $table->decimal('stock_out', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->default(0);
            $table->string('unit', 32)->default('pcs');
            $table->decimal('min_stock_alert', 12, 2)->default(5);
            $table->string('mapping_doc_url', 255)->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });

        // 4. Material Issuing (MAT-005 / MAT-011)
        Schema::create('material_issuings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->date('issue_date');
            $table->string('issue_no', 64)->unique();
            $table->string('requestor', 128); // e.g. Workshop Spool Fab Team A
            $table->string('target_spool_no', 64)->nullable(); // e.g. SP-01
            $table->string('target_line_no', 64)->nullable(); // e.g. 15-MPP-AB
            $table->string('drawing_no', 128)->nullable(); // e.g. 2428-M-15-MPP-AB-SHT1
            $table->string('item_name', 128);
            $table->string('specification', 128);
            $table->string('size', 32);
            $table->decimal('qty', 12, 2)->default(1);
            $table->string('unit', 32)->default('pcs');
            $table->string('heat_no', 64)->nullable();
            $table->string('issued_by', 128)->default('Material Control');
            $table->text('remarks')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_issuings');
        Schema::dropIfExists('material_storings');
        Schema::dropIfExists('material_inspections');
        Schema::dropIfExists('material_receivings');
    }
};
