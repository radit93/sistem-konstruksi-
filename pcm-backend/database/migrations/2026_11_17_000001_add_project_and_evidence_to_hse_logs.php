<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * hse_logs sebelumnya hanya buku catatan global: tanpa project_id, nomor
     * dokumen, PIC, tenggat, maupun bukti foto. Kolom-kolom ini membuat log
     * harian bisa ditelusuri dan dicetak sebagai laporan per project.
     */
    public function up(): void
    {
        Schema::table('hse_logs', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('id')->constrained('projects')->nullOnDelete();
            $table->string('log_no')->nullable()->after('project_id');
            $table->string('location')->nullable()->after('kind');
            $table->string('severity')->nullable()->after('status');
            $table->string('pic')->nullable()->after('severity');
            $table->date('due_date')->nullable()->after('pic');
            $table->string('photo_path')->nullable()->after('due_date');
            $table->foreignId('created_by')->nullable()->after('department_id')->constrained('users')->nullOnDelete();
            $table->index(['project_id', 'log_date']);
        });
    }

    public function down(): void
    {
        Schema::table('hse_logs', function (Blueprint $table) {
            $table->dropIndex(['project_id', 'log_date']);
            $table->dropConstrainedForeignId('project_id');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['log_no', 'location', 'severity', 'pic', 'due_date', 'photo_path']);
        });
    }
};
