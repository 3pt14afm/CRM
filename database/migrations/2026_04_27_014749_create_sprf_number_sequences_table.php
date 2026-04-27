<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sprf_number_sequences', function (Blueprint $table) {
            $table->id();

            // Format: YYYYMM, example: 202604
            $table->string('period', 6)->unique();

            // Last used sequence number for that period.
            $table->unsignedInteger('last_number')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprf_number_sequences');
    }
};