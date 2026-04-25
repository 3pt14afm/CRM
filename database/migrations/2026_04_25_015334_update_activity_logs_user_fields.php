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
        Schema::table('activity_logs', function (Blueprint $table) {
    $table->string('first_name')->nullable()->after('user_id');
    $table->string('last_name')->nullable()->after('first_name');
    $table->string('employee_id')->nullable()->after('last_name');
    $table->unsignedBigInteger('department_id')->nullable()->after('employee_id');
    $table->string('position')->nullable()->after('department_id');
    $table->string('email')->nullable()->after('position');

    // optional: drop old field
        $table->dropColumn('user_role');
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
