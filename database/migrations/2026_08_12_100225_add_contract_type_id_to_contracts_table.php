<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->foreignId('ctid')
                ->nullable()
                ->after('id')
                ->comment('contract_type_id')
                ->constrained('contract_type')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropForeign(['ctid']);
            $table->dropColumn('ctid');
        });
    }
};