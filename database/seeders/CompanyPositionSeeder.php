<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CompanyPosition;

class CompanyPositionSeeder extends Seeder
{
    public function run(): void
    {
        $positions = [
            [
                'code' => 'AM-001',
                'name' => 'Account Manager',
                'department' => 'Sales',
                'is_active' => true,
            ],
            [
                'code' => 'SA-001',
                'name' => 'Sales Associate',
                'department' => 'Sales',
                'is_active' => true,
            ],
            [
                'code' => 'HR-001',
                'name' => 'HR Officer',
                'department' => 'Human Resources',
                'is_active' => true,
            ],
            [
                'code' => 'MK-001',
                'name' => 'Marketing Specialist',
                'department' => 'Marketing',
                'is_active' => true,
            ],
        ];

        foreach ($positions as $position) {
            CompanyPosition::create($position);
        }
    }
}