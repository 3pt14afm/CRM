<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The three ROI pipeline tables, each identically shaped for this change.
     */
    private array $tables = [
        'roi_entry_projects',
        'roi_current_projects',
        'roi_archive_projects',
    ];

    public function up(): void
    {
        // Step 1: add the nullable `sequence` column.
        // NULL = single entry (today's behavior, untouched).
        // 1..x = position within a multi-entry group sharing the same `reference`.
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->unsignedInteger('sequence')->default(0)->after('reference');
            });
        }

        // Step 2: replace the standalone UNIQUE on `reference` with a composite
        // UNIQUE on (reference, sequence). Required because multi-entry rows
        // will now legitimately share one `reference` value.
        //
        // Note: MySQL/MariaDB unique indexes treat each NULL as distinct, so
        // this does NOT by itself stop two single-entry rows (sequence = NULL)
        // from sharing a reference — that invariant (one row per reference
        // when sequence is null) is enforced at the application layer, same
        // as it always has been.
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropUnique("{$tableName}_reference_unique");
                $table->unique(['reference', 'sequence']);
            });
        }
    }

    public function down(): void
    {
        // Reverse in the opposite order: restore the single-column unique
        // before dropping `sequence`, and drop the composite unique first.
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropUnique("{$tableName}_reference_sequence_unique");
                $table->unique('reference');
            });
        }

        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn('sequence');
            });
        }
    }
};