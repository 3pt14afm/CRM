<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('preferences', function (Blueprint $table) {
            $table->string('value_type')
                ->default('numeric')
                ->after('settings_id');

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

        DB::table('preferences')->insert([
            [
                'settings_id'  => 'CONTRACT_UPLOAD_ACCESS',
                'settings_key' => 'Contract Upload Access',
                'value_type'   => 'employee_list',
                'employee_ids' => json_encode(['0283']),
                'is_active'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'settings_id'  => 'COMPANY_VISIBILITY_ACCESS',
                'settings_key' => 'Company Visibility Access',
                'value_type'   => 'employee_list',
                'employee_ids' => json_encode(config('access.privileged_employee_ids', [])),
                'is_active'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('preferences')
            ->whereIn('settings_id', [
                'CONTRACT_UPLOAD_ACCESS',
                'COMPANY_VISIBILITY_ACCESS',
            ])
            ->delete();

        Schema::table('preferences', function (Blueprint $table) {
            $table->dropColumn([
                'value_type',
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
