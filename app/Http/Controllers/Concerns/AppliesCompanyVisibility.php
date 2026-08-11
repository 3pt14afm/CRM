<?php

namespace App\Http\Controllers\Concerns;

use App\Models\LocationDepartment;
use Illuminate\Support\Facades\Auth;

/**
 * Shared visibility scoping for Company / PotentialCustomer queries.
 *
 * A row (joined against `client_managers`, i.e. users aliased via
 * id_client_mngr = client_managers.employee_id) is visible to a
 * non-admin, non-privileged user if:
 *   - they are the client manager themselves, OR
 *   - they are an approver (per LocationDepartment) for the client
 *     manager's own (primary_location_id, department_id) combo.
 *
 * Admin (user id === 1) and privileged employees (see config/access.php)
 * see everything.
 */
trait AppliesCompanyVisibility
{
    use ChecksPreferenceAccess;

    protected function applyCompanyVisibility($query): void
    {
        $currentUser = Auth::user();
        $userId      = (int) ($currentUser->id ?? 0);
        $employeeId  = $currentUser->employee_id ?? null;
        $isAdmin     = $userId === 1;

        if ($isAdmin || $this->isCompanyVisibilityPrivileged()) {
            return;
        }

        $approverLocationDepts = LocationDepartment::query()
            ->where(function ($q) use ($userId) {
                $q->where('reviewed_by', $userId)
                  ->orWhere('checked_by', $userId)
                  ->orWhere('endorsed_by', $userId)
                  ->orWhere('confirmed_by', $userId)
                  ->orWhere('approved_by', $userId);
            })
            ->get(['location_id', 'department_id']);

        $query->where(function ($q) use ($employeeId, $approverLocationDepts) {
            $q->where('client_managers.employee_id', $employeeId);

            if ($approverLocationDepts->isNotEmpty()) {
                $q->orWhere(function ($qOr) use ($approverLocationDepts) {
                    foreach ($approverLocationDepts as $ld) {
                        $qOr->orWhere(function ($qPair) use ($ld) {
                            $qPair->where('client_managers.primary_location_id', $ld->location_id)
                                  ->where('client_managers.department_id', $ld->department_id);
                        });
                    }
                });
            }
        });
    }
}