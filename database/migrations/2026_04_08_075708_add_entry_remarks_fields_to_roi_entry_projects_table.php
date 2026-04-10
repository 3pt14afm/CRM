<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('roi_entry_projects', function (Blueprint $table) {
            $table->text('entry_remarks')->nullable()->after('color_yield_annual');
            $table->json('entry_remarks_attachments')->nullable()->after('entry_remarks');
        });
    }

    public function down(): void
    {
        Schema::table('roi_entry_projects', function (Blueprint $table) {
            $table->dropColumn([
                'entry_remarks',
                'entry_remarks_attachments',
            ]);
        });
    }
};