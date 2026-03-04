<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
public function run(): void
{
    $this->call(LocationSeeder::class); // ✅ run locations first

    $password = Hash::make('password');

    $users = [
        [
            'name'     => 'Admin User',
            'email'    => 'admin@example.com',
            'role'     => 'admin',
            'location' => [],
        ],
        [
            'name'     => 'Preparer User',
            'email'    => 'preparer@example.com',
            'role'     => 'preparer',
            'location' => ['Cebu City'],
        ],
        [
            'name'     => 'Reviewer User',
            'email'    => 'reviewer@example.com',
            'role'     => 'reviewer',
            'location' => ['Cebu City'],
        ],
        [
            'name'     => 'Checker User',
            'email'    => 'checkermanila@example.com',
            'role'     => 'checker',
            'location' => ['Manila'],
        ],
         [
            'name'     => 'Checker User',
            'email'    => 'checkercebu@example.com',
            'role'     => 'checker',
            'location' => ['Cebu City'],
        ],
        [
            'name'     => 'Endorser User',
            'email'    => 'endorser@example.com',
            'role'     => 'endorser',
            'location' => ['Manila'],
        ],
        [
            'name'     => 'Confirmer User',
            'email'    => 'confirmer@example.com',
            'role'     => 'confirmer',
            'location' => ['Quezon City'],
        ],
        [
            'name'     => 'Approver User',
            'email'    => 'approver@example.com',
            'role'     => 'approver',
            'location' => ['Quezon City'],
        ],
    ];


    foreach ($users as $u) {
        User::updateOrCreate(
            ['email' => $u['email']],
            [
                'name'              => $u['name'],
                'role'              => $u['role'],
                'password'          => $password,
                'email_verified_at' => now(),
                'location'          => $u['location'],
            ]
        );
    }
}
}