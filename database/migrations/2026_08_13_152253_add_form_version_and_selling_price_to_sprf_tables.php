<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $table->unsignedTinyInteger('form_version')->default(1)->after('status');
        });
        Schema::table('sprf_entry_item_subitems', function (Blueprint $table) {
            $table->decimal('selling_price_per_unit', 15, 2)->nullable()->after('markup_percent');
        });

        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $table->unsignedTinyInteger('form_version')->default(1)->after('status');
        });
        Schema::table('sprf_current_item_subitems', function (Blueprint $table) {
            $table->decimal('selling_price_per_unit', 15, 2)->nullable()->after('markup_percent');
        });

        Schema::table('sprf_archive_projects', function (Blueprint $table) {
            $table->unsignedTinyInteger('form_version')->default(1)->after('status');
        });
        Schema::table('sprf_archive_item_subitems', function (Blueprint $table) { 
            $table->decimal('selling_price_per_unit', 15, 2)->nullable()->after('markup_percent');
        });
    }

    public function down(): void
    {
        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $table->dropColumn('form_version');
        });
        Schema::table('sprf_entry_item_subitems', function (Blueprint $table) {
            $table->dropColumn('selling_price_per_unit');
        });

        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $table->dropColumn('form_version');
        });
        Schema::table('sprf_current_item_subitems', function (Blueprint $table) {
            $table->dropColumn('selling_price_per_unit');
        });

        Schema::table('sprf_archive_projects', function (Blueprint $table) {
            $table->dropColumn('form_version');
        });
        Schema::table('sprf_archive_item_subitems', function (Blueprint $table) {
            $table->dropColumn('selling_price_per_unit');
        });
    }
};