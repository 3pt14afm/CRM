<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE preferences
            MODIFY entity_attribute ENUM('day', 'week', 'month', 'year') NOT NULL
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE preferences
            MODIFY entity_attribute ENUM('day', 'month', 'year') NOT NULL
        ");
    }
};