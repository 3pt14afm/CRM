<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('printer_supply_page_supplies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supply_id')->constrained('supplies')->cascadeOnDelete();
            $table->string('status')->default('Active');
            $table->timestamps();

            $table->unique('supply_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('printer_supply_page_supplies');
    }
};