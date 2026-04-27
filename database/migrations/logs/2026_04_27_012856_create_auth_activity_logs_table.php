<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_logs';

    public function up(): void
    {
        Schema::connection('mysql_logs')->create('auth_activity_logs', function (Blueprint $table) {
            $table->id();

            $table->string('yyyymm', 6)->index();

            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('email')->nullable();

            $table->string('activity_type')->index(); // login, logout, etc
            $table->text('details')->nullable();

            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();

            $table->string('status')->default('success');

            $table->timestamps();

            $table->index(['yyyymm', 'activity_type']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_logs')->dropIfExists('auth_activity_logs');
    }
};