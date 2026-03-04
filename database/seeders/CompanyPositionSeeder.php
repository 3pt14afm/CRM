<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CompanyPosition;

class CompanyPositionSeeder extends Seeder
{
    public function run(): void
    {
        $positions = [
            'Account Manager',
            'Sales Manager',
            'Sales Director',
            'VP - Sales & Marketing',
            'Executive Admin Officer',
            'CEO/President',
        ];

        foreach ($positions as $name) {
            CompanyPosition::firstOrCreate(['name' => $name]);
        }
    }
}