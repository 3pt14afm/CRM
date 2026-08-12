<?php

namespace Database\Seeders;

use App\Models\Contracts\ContractType;
use Illuminate\Database\Seeder;

class ContractTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            'Free Use + per Cartridge',
            'Rental + Click Charge',
            'Free Use + Click Charge',
            'Rental + per Cartridge',
            'Fixed Monthly Only',
            'Outright + Click Charge',
            'Outright + per Cartridge',
            'Outright Only (1 year)',
        ];

        foreach ($types as $name) {
            ContractType::firstOrCreate(['name' => $name]);
        }
    }
}