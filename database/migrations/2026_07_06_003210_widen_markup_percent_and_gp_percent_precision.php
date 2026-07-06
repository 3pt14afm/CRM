<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $subitemTables = [
        'sprf_entry_item_subitems',
        'sprf_current_item_subitems',
        'sprf_archive_item_subitems',
    ];

    private array $projectTables = [
        'sprf_entry_projects',
        'sprf_current_projects',
        'sprf_archive_projects',
    ];

    public function up(): void
    {
        // markup_percent and gp_percent were both created as decimal(8,2),
        // which silently rounds to 2 decimal places at the database layer
        // regardless of what the application sends. Widen both to
        // decimal(8,4) so the extra precision entered on the frontend (and
        // now cast as decimal:4 on the models) is actually persisted.
        foreach ($this->subitemTables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->decimal('markup_percent', 8, 4)->nullable()->change();
            });
        }

        foreach ($this->projectTables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->decimal('gp_percent', 8, 4)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->subitemTables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->decimal('markup_percent', 8, 2)->nullable()->change();
            });
        }

        foreach ($this->projectTables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->decimal('gp_percent', 8, 2)->nullable()->change();
            });
        }
    }
};