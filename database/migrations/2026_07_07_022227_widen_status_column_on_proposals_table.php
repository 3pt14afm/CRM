<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE proposals MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        // Reverts to the original enum — will fail if any rows already
        // have 'awarded' or 'closed' at rollback time.
        DB::statement("ALTER TABLE proposals MODIFY COLUMN status ENUM('draft', 'generated') NOT NULL DEFAULT 'draft'");
    }
};