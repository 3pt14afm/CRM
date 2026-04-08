<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up(): void
{
    Schema::table('roi_current_items', function (Blueprint $table) {
        $table->boolean('auto_added')->default(false)->after('remarks');
    });
}

public function down(): void
{
    Schema::table('roi_current_items', function (Blueprint $table) {
        $table->dropColumn('auto_added');
    });
}
};
