<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CompanyEmployee;
use App\Models\CompanyPosition;
use App\Models\Location;

class CompanyEmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $pos = CompanyPosition::pluck('id', 'name');
        $loc = Location::pluck('id', 'name');

        $employees = [
            ['code' => 'EMP-001', 'name' => 'Juan Dela Cruz', 'position' => 'Account Manager',     'main_loc' => 'Cebu City'],
            ['code' => 'EMP-002', 'name' => 'Maria Santos',   'position' => 'Sales Manager',       'main_loc' => 'Manila'],
            ['code' => 'EMP-003', 'name' => 'Pedro Reyes',    'position' => 'Sales Director',      'main_loc' => 'Makati'],
            ['code' => 'EMP-004', 'name' => 'Ana Lim',        'position' => 'Executive Admin Officer',        'main_loc' => 'Quezon City'],
            ['code' => 'EMP-005', 'name' => 'Ken Tan',        'position' => 'VP - Sales & Marketing',  'main_loc' => 'Davao'],
            ['code' => 'EMP-006', 'name' => 'Liza Gomez',     'position' => 'CEO/President',        'main_loc' => 'Manila'],
        ];

        foreach ($employees as $e) {
            $positionId = $pos[$e['position']] ?? null;
            $locationId = $loc[$e['main_loc']] ?? null;

            if (!$positionId || !$locationId) continue;

            CompanyEmployee::updateOrCreate(
                ['employee_code' => $e['code']],
                [
                    'name' => $e['name'],
                    'position_id' => $positionId,
                    'primary_location_id' => $locationId,
                    'is_active' => true,
                ]
            );
        }
    }
}