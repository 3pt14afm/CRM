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
        // Common password for all seeded accounts (change if you want)
        $password = Hash::make('password');

        $users = [
            [
                'name'  => 'Preparer User',
                'email' => 'preparer@example.com',
                'role'  => 'preparer',
            ],
            [
                'name'  => 'Reviewer User',
                'email' => 'reviewer@example.com',
                'role'  => 'reviewer',
            ],
            [
                'name'  => 'Checker User',
                'email' => 'checker@example.com',
                'role'  => 'checker',
            ],
            [
                'name'  => 'Endorser User',
                'email' => 'endorser@example.com',
                'role'  => 'endorser',
            ],
            [
                'name'  => 'Confirmer User',
                'email' => 'confirmer@example.com',
                'role'  => 'confirmer',
            ],
            [
                'name'  => 'Approver User',
                'email' => 'approver@example.com',
                'role'  => 'approver',
            ],
        ];

        foreach ($users as $u) {
            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'role' => $u['role'],
                    'password' => $password,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}