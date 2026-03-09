<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CompanyDepartment;
use App\Models\CompanyPosition;

class CompanyPositionSeeder extends Seeder
{
    public function run(): void
    {
        $departments = CompanyDepartment::pluck('id', 'name');

        $positions = [
            [
                'code' => 'AM-001',
                'name' => 'Account Manager',
                'department_name' => 'Sales',
                'is_active' => true,
            ],
            [
                'code' => 'SA-001',
                'name' => 'Sales Associate',
                'department_name' => 'Sales',
                'is_active' => true,
            ],
            [
                'code' => 'HR-001',
                'name' => 'HR Officer',
                'department_name' => 'Human Resources',
                'is_active' => true,
            ],
            [
                'code' => 'MK-001',
                'name' => 'Marketing Specialist',
                'department_name' => 'Marketing',
                'is_active' => true,
            ],
        ];

        foreach ($positions as $position) {
            $departmentId = $departments[$position['department_name']] ?? null;

            if (!$departmentId) {
                continue;
            }

            CompanyPosition::create([
                'code' => $position['code'],
                'name' => $position['name'],
                'department_id' => $departmentId,
                'is_active' => $position['is_active'],
            ]);
        }
    }
}