<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Preferences;

class PreferencesSeeder extends Seeder
{
    public function run(): void
    {
        Preferences::updateOrCreate(
            ['settings_id' => 'PWX'],
            [
                'settings_key' => 'Password Expiry',
                'setting_value' => 90,
                'entity_attribute' => 'day',
                'is_active' => true,
            ]
        );

        Preferences::updateOrCreate(
            ['settings_id' => 'CONTRACT_UPLOAD_ACCESS'],
            [
                'settings_key' => 'Contract Upload Access',
                'description' => 'Employees allowed to upload contracts.',
                'value_type' => 'employee_list',
                'employee_ids' => [],
                'is_active' => true,
            ]
        );

        Preferences::updateOrCreate(
            ['settings_id' => 'COMPANY_VISIBILITY_ACCESS'],
            [
                'settings_key' => 'Company Visibility Access',
                'description' => 'Employees allowed to view all companies.',
                'value_type' => 'employee_list',
                'employee_ids' => [],
                'is_active' => true,
            ]
        );

        Preferences::updateOrCreate(
            ['settings_id' => 'SPRF_VIEW_ALL_ACCESS'],
            [
                'settings_key' => 'View All SPRF Access',
                'description' => 'Employees allowed to view all SPRF projects (view only).',
                'value_type' => 'employee_list',
                'employee_ids' => [],
                'is_active' => true,
            ]
        );
    }
}