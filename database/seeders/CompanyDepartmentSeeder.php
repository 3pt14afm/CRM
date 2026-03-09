<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CompanyDepartment;

class CompanyDepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            [
                'code' => 'SALES',
                'name' => 'Sales',
                'is_active' => true,
            ],
            [
                'code' => 'HR',
                'name' => 'Human Resources',
                'is_active' => true,
            ],
            [
                'code' => 'MKTG',
                'name' => 'Marketing',
                'is_active' => true,
            ],
        ];

        foreach ($departments as $department) {
            CompanyDepartment::updateOrCreate(
                ['code' => $department['code']],
                $department
            );
        }
    }
}