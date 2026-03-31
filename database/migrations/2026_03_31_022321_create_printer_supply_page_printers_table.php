<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('printer_supply_page_printers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('printer_model_id')->constrained('printer_models')->cascadeOnDelete();
            $table->string('status')->default('Active');
            $table->timestamps();

            $table->unique('printer_model_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('printer_supply_page_printers');
    }
};