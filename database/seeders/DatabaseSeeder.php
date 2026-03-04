<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Location;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // must seed locations first
        $this->call([
            LocationSeeder::class,
            CompanyPositionSeeder::class,
            CompanyEmployeeSeeder::class,
        ]);

        $password = Hash::make('password');

        // build name => id map
        $locationIdByName = Location::pluck('id', 'name')->toArray();

        // helper: names -> ids
        $namesToIds = function (array $names) use ($locationIdByName) {
            return array_values(array_filter(array_map(
                fn ($n) => $locationIdByName[$n] ?? null,
                $names
            )));
        };

        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'role' => 'admin',
                'primary_location' => 'Manila',
                'allowed_locations' => ['Manila'], 
            ],
            [
                'name' => 'Preparer User',
                'email' => 'preparer@example.com',
                'role' => 'preparer',
                'primary_location' => 'Cebu City',
                'allowed_locations' => ['Cebu City', 'Makati'],
            ],
            [
                'name' => 'Reviewer User',
                'email' => 'reviewer@example.com',
                'role' => 'reviewer',
                'primary_location' => 'Cebu City',
                'allowed_locations' => ['Cebu City'],
            ],
            [
                'name' => 'Checker Manila',
                'email' => 'checkermanila@example.com',
                'role' => 'checker',
                'primary_location' => 'Manila',
                'allowed_locations' => ['Manila'],
            ],
            [
                'name' => 'Checker Cebu',
                'email' => 'checkercebu@example.com',
                'role' => 'checker',
                'primary_location' => 'Cebu City',
                'allowed_locations' => ['Cebu City'],
            ],
            [
                'name' => 'Endorser User',
                'email' => 'endorser@example.com',
                'role' => 'endorser',
                'primary_location' => 'Manila',
                'allowed_locations' => ['Manila'],
            ],
            [
                'name' => 'Confirmer User',
                'email' => 'confirmer@example.com',
                'role' => 'confirmer',
                'primary_location' => 'Quezon City',
                'allowed_locations' => ['Quezon City'],
            ],
            [
                'name' => 'Approver User',
                'email' => 'approver@example.com',
                'role' => 'approver',
                'primary_location' => 'Quezon City',
                'allowed_locations' => ['Quezon City'],
            ],
        ];

        foreach ($users as $u) {
            $primaryId = $locationIdByName[$u['primary_location']] ?? null;
            $allowedIds = $namesToIds($u['allowed_locations']);

            // primary must exist and must be included in allowed list
            if ($primaryId !== null && !in_array($primaryId, $allowedIds, true)) {
                $allowedIds[] = $primaryId;
            }

            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'role' => $u['role'],
                    'password' => $password,
                    'email_verified_at' => now(),

                    // main location
                    'primary_location_id' => $primaryId,

                    // allowed/assigned location IDs JSON
                    'location' => array_values(array_unique($allowedIds)),
                ]
            );
        }
    }
}