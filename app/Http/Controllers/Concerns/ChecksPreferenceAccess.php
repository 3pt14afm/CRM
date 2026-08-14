<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Preferences;
use Illuminate\Support\Facades\Auth;

trait ChecksPreferenceAccess
{
    protected function isContractUploadPrivileged(): bool
    {
        return $this->hasPreferenceAccess('CONTRACT_UPLOAD_ACCESS');
    }

    protected function isCompanyVisibilityPrivileged(): bool
    {
        return $this->hasPreferenceAccess('COMPANY_VISIBILITY_ACCESS');
    }

    protected function isSprfViewAllPrivileged(): bool
    {
        return $this->hasPreferenceAccess('SPRF_VIEW_ALL_ACCESS');
    }

    protected function hasPreferenceAccess(string $settingsId): bool
    {
        $employeeId = Auth::user()->employee_id ?? null;
        if (!$employeeId) return false;

        $ids = cache()->remember("preference_access_{$settingsId}", now()->addMinutes(10), function () use ($settingsId) {
            $pref = Preferences::where('settings_id', $settingsId)->where('is_active', true)->first();
            return $pref?->employee_ids ?? [];
        });

        return in_array((string) $employeeId, $ids, true);
    }
}