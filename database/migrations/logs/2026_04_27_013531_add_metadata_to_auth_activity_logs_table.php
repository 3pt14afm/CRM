<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_logs';

    public function up(): void
    {
        Schema::connection('mysql_logs')->table('auth_activity_logs', function (Blueprint $table) {
            $table->json('metadata')->nullable()->after('details');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_logs')->table('auth_activity_logs', function (Blueprint $table) {
            $table->dropColumn('metadata');
        });
    }
};