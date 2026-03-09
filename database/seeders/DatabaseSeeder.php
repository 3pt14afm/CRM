<?php

namespace Database\Seeders;

use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            LocationSeeder::class,
            CompanyDepartmentSeeder::class,
            CompanyPositionSeeder::class,
            CompanyEmployeeSeeder::class,
        ]);

        $manilaId = Location::where('name', 'Manila')->value('id');

        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'first_name'          => 'Admin',
                'last_name'           => 'User',
                'employee_id'         => 0001,
                'position'            => 'Administrator',
                'password'            => Hash::make('P@ssw0rd'),
                'email_verified_at'   => now(),
                'primary_location_id' => $manilaId,
                'is_banned'           => false,
            ]
        );
    }
}