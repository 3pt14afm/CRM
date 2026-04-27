<?php

namespace App\Services;

use App\Models\RoiActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class RoiActivityLogger
{
    protected static array $hiddenFields = [
        'password',
        'password_confirmation',
        'remember_token',
        'api_token',
        'access_token',
        'refresh_token',
        'token',
        'secret',
        'private_key',
        'otp',
        'pin',
    ];

    public static function log(
        string $activityType,
        ?string $moduleType = 'ROI',
        ?string $details = null,
        ?Model $subject = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        string $status = 'success',
        ?array $workflow = null
    ): void {
        $user = Auth::user();

        RoiActivityLog::create([
            'yyyymm' => now()->format('Ym'),

            'user_id' => $user?->id,

            'first_name' => $user?->first_name,
            'last_name' => $user?->last_name,
            'employee_id' => $user?->employee_id,
            'department_id' => $user?->department_id,
            'location_id' => $user?->primary_location_id,

            'preparer_id' => $workflow['preparer_id'] ?? null,
            'reviewer_id' => $workflow['reviewer_id'] ?? null,
            'checker_id' => $workflow['checker_id'] ?? null,
            'endorser_id' => $workflow['endorser_id'] ?? null,
            'confirmer_id' => $workflow['confirmer_id'] ?? null,
            'approver_id' => $workflow['approver_id'] ?? null,

            'position' => $user?->position,
            'email' => $user?->email,

            'module_type' => $moduleType ?? 'ROI',
            'activity_type' => $activityType,

            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject?->id,

            'old_values' => self::cleanValues($oldValues),
            'new_values' => self::cleanValues($newValues),

            'activity_details' => $details
                ?: trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? '')) . ' performed ' . $activityType,

            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'route_name' => request()->route()?->getName(),
            'url' => request()->path(),
            'method' => request()->method(),

            'status' => $status,
        ]);
    }

    private static function cleanValues(?array $values): ?array
    {
        if (!$values) {
            return null;
        }

        foreach ($values as $key => $value) {
            if (in_array(strtolower($key), self::$hiddenFields)) {
                $values[$key] = '[REDACTED]';
            }
        }

        return $values;
    }
}