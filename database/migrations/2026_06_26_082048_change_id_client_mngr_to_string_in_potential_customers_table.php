<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('potential_customers', function (Blueprint $table) {
            $table->string('id_client_mngr')->change();
        });
    }

    public function down(): void
    {
        Schema::table('potential_customers', function (Blueprint $table) {
            $table->unsignedBigInteger('id_client_mngr')->change();
        });
    }
};