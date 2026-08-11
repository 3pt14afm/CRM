<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('preferences', function (Blueprint $table) {
            $table->string('value_type')
                ->default('numeric')
                ->after('settings_id');

            $table->string('description')
                ->nullable()
                ->after('value_type');

            $table->json('employee_ids')
                ->nullable()
                ->after('setting_value');

            $table->integer('setting_value')
                ->nullable()
                ->change();

            $table->string('entity_attribute')
                ->nullable()
                ->change();
        });
    }

    public function down(): void
    {
        Schema::table('preferences', function (Blueprint $table) {
            $table->dropColumn([
                'value_type',
                'description',
                'employee_ids',
            ]);

            $table->integer('setting_value')
                ->nullable(false)
                ->change();

            $table->string('entity_attribute')
                ->nullable(false)
                ->change();
        });
    }
};