<?php

namespace Database\Seeders;

use App\Models\Location;
use Illuminate\Database\Seeder;

class LocationSeeder extends Seeder
{
    public function run(): void
    {
        $locations = [
            ['name' => 'Manila',      'code' => 'MN-001'],
            ['name' => 'Quezon City', 'code' => 'QC-002'],
            ['name' => 'Cebu City',   'code' => 'CB-003'],
            ['name' => 'Davao',       'code' => 'DV-004'],
            ['name' => 'Makati',      'code' => 'MK-005'],
            // add more as needed
        ];

        foreach ($locations as $location) {
            Location::firstOrCreate(
                ['name' => $location['name']],
                ['code' => $location['code']]
            );
        }
    }
}