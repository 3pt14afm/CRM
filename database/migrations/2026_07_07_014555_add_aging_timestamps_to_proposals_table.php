<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
            Schema::table('proposals', function (Blueprint $table) {
                $table->timestamp('generated_at')->nullable();
                $table->timestamp('archived_at')->nullable()->after('generated_at');
            });
    }

    public function down(): void
    {
        Schema::table('proposals', function (Blueprint $table) {
            $table->dropColumn(['generated_at', 'archived_at']);
        });
    }
};