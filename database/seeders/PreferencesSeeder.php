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
                'setting_value' => 60,
                'entity_attribute' => 'day',
                'is_active' => true,
            ]
        );
    }
}