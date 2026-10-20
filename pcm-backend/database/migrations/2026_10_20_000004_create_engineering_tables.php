<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Line Service (ENG-001 / ENG-008)
        Schema::create('line_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('line_no', 64)->index();
            $table->string('service_name', 128);
            $table->string('fluid_code', 32)->nullable();
            $table->string('piping_class', 64)->nullable();
            $table->string('design_press', 32)->nullable();
            $table->string('design_temp', 32)->nullable();
            $table->string('operating_press', 32)->nullable();
            $table->string('operating_temp', 32)->nullable();
            $table->string('test_press', 32)->nullable();
            $table->string('test_medium', 32)->default('Hydro (Water)');
            $table->string('insulation', 64)->default('None');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Material Standard (ENG-005 / ENG-012)
        Schema::create('material_standards', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('category', 64); // Pipe, Fitting, Flange, Valve, Gasket, Fastener
            $table->string('specification', 128); // ASTM A106 Gr. B, ASTM A105, etc.
            $table->string('material_group', 64); // Carbon Steel, Stainless Steel, Alloy Steel
            $table->string('rating_class', 32)->nullable(); // 150#, 300#, 600#, etc.
            $table->string('schedule', 32)->nullable(); // Sch 40, Sch 80, STD, etc.
            $table->string('size_range', 64)->nullable(); // 1/2" - 24"
            $table->text('description')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });

        // 3. Welding Map (ENG-002 / ENG-009)
        Schema::create('welding_maps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('drawing_id')->nullable()->constrained('drawings')->nullOnDelete();
            $table->string('line_no', 64)->nullable();
            $table->string('iso_drawing_no', 128)->index();
            $table->string('sheet', 32)->default('Sheet 1');
            $table->string('spool_no', 64)->index();
            $table->string('joint_no', 64)->index();
            $table->string('joint_type', 32)->default('BW'); // BW, SW, FW, THD
            $table->string('size', 32); // e.g. 4"
            $table->decimal('dia_inch', 8, 2)->default(0);
            $table->string('thickness', 32)->nullable(); // e.g. Sch 40 / 6.02 mm
            $table->string('location', 32)->default('Shop'); // Shop, Field
            $table->string('wps_no', 64)->default('WPS-01');
            $table->string('mat_a_item', 64)->nullable();
            $table->string('mat_a_spec', 64)->nullable();
            $table->string('mat_a_size', 32)->nullable();
            $table->string('mat_a_sch', 32)->nullable();
            $table->string('mat_b_item', 64)->nullable();
            $table->string('mat_b_spec', 64)->nullable();
            $table->string('mat_b_size', 32)->nullable();
            $table->string('mat_b_sch', 32)->nullable();
            $table->string('status', 32)->default('PLANNED'); // PLANNED, FITUP_OK, WELDED, NDT_OK
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });

        // 4. Bill of Material / BOM / MTO (ENG-004 / ENG-011)
        Schema::create('bill_of_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('drawing_id')->nullable()->constrained('drawings')->nullOnDelete();
            $table->string('spool_no', 64)->nullable();
            $table->string('item_no', 32);
            $table->string('component_type', 64); // Pipe, Elbow 90, Flange WN, Valve, etc.
            $table->string('description', 255);
            $table->string('size', 32);
            $table->string('rating_sch', 32)->nullable();
            $table->string('material_spec', 128);
            $table->decimal('qty', 10, 2)->default(1);
            $table->string('unit', 32)->default('MTR');
            $table->string('tag_number', 64)->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });

        // 5. Bill of Quantity / BOQ Teknis Engineering (ENG-003 / ENG-010)
        Schema::create('engineering_boqs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('drawing_id')->nullable()->constrained('drawings')->nullOnDelete();
            $table->string('line_no', 64)->nullable();
            $table->string('item_code', 64);
            $table->string('work_scope', 255); // Spool Fab CS, Field Erection CS, Support Fab, etc.
            $table->string('material_group', 64)->default('Carbon Steel');
            $table->decimal('dia_inch_total', 10, 2)->default(0);
            $table->unsignedInteger('joints_count')->default(0);
            $table->unsignedInteger('spools_count')->default(0);
            $table->decimal('weight_kg', 10, 2)->default(0);
            $table->string('status', 32)->default('ESTIMATED'); // ESTIMATED, APPROVED, IN_FABRICATION
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });

        // 6. Document Control (ENG-006 / ENG-013)
        Schema::create('document_controls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('drawing_id')->nullable()->constrained('drawings')->nullOnDelete();
            $table->string('document_no', 128);
            $table->string('drawing_no', 128)->index();
            $table->string('title', 255);
            $table->string('rev_no', 16)->default('0');
            $table->string('status_doc', 32)->default('IFC'); // IFR, IFA, IFC, AS-BUILT
            $table->date('incoming_date')->nullable();
            $table->date('issued_date')->nullable();
            $table->string('distributed_to', 128)->nullable();
            $table->string('receiver_name', 128)->nullable();
            $table->string('transmittal_no', 64)->nullable();
            $table->string('file_path', 255)->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_controls');
        Schema::dropIfExists('engineering_boqs');
        Schema::dropIfExists('bill_of_materials');
        Schema::dropIfExists('welding_maps');
        Schema::dropIfExists('material_standards');
        Schema::dropIfExists('line_services');
    }
};
