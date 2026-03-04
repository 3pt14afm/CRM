<?php

namespace App\Support;

use App\Models\User;

class RoiWorkflow
{
    /**
     * Map user.role -> workflow level (1..6).
     * Return null if role is not part of the workflow.
     */
    public static function levelForUser(User $user): ?int
    {
        $role = strtolower(trim((string) $user->role));

        return match ($role) {
            // Choose the exact strings to be used
            'prepared', 'prepared_by', 'preparer', 'level1' => 1,
            'reviewed', 'reviewer', 'reviewed_by', 'level2' => 2,
            'checked', 'checker', 'checked_by', 'level3' => 3,
            'endorsed', 'endorser', 'endorsed_by', 'level4' => 4,
            'confirmed', 'confirmer', 'confirmed_by', 'level5' => 5,
            'approved', 'approver', 'approved_by', 'level6' => 6,

            default => null,
        };
    }

    public static function labelForLevel(int $level): string
    {
        return match ($level) {
            1 => 'Prepared By',
            2 => 'Reviewed By',
            3 => 'Checked By',
            4 => 'Endorsed By',
            5 => 'Confirmed By',
            6 => 'Approved By',
            default => 'Unknown',
        };
    }
}