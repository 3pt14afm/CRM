<?php

namespace App\Http\Controllers\Concerns;

use App\Models\CustomerInfo\Company;
use App\Models\LocationDepartment;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

trait ManagesCompanyContracts
{
    // Include the visibility trait here so any controller using this new trait automatically gets it.
    use AppliesCompanyVisibility;

    protected function visibleCompanyIds()
    {
        $employeeId = Auth::user()->employee_id ?? null;

        if ($this->isAdmin() || $this->isCompanyVisibilityPrivileged()) {
            return Company::query()->where('status', 1)->pluck('id');
        }

        $companyTable = (new Company())->getTable();

        $query = Company::query()
            ->leftJoin('users as client_managers', function ($join) use ($companyTable) {
                $join->on(
                    DB::raw("{$companyTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                    '=',
                    DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                );
            })
            ->where("{$companyTable}.status", 1) 
            ->select("{$companyTable}.id");

        $this->applyCompanyVisibility($query);

        return $query->pluck('id');
    }

    protected function isAdmin(): bool
    {
        $currentUser = Auth::user();
        return $currentUser && (int) $currentUser->id === 1;
    }

    protected function isApproverForCompany(Company $company): bool
    {
        $currentUser = Auth::user();
        if (!$currentUser) return false;

        $clientManager = User::where('employee_id', $company->id_client_mngr)->first();
        if (!$clientManager) return false;

        return LocationDepartment::query()
            ->where(function ($q) use ($currentUser) {
                $q->where('reviewed_by', $currentUser->id)
                  ->orWhere('checked_by', $currentUser->id)
                  ->orWhere('endorsed_by', $currentUser->id)
                  ->orWhere('confirmed_by', $currentUser->id)
                  ->orWhere('approved_by', $currentUser->id);
            })
            ->where('location_id', $clientManager->primary_location_id)
            ->where('department_id', $clientManager->department_id)
            ->exists();
    }

    protected function canAccessCompanyContracts(Company $company): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        if ($this->isCompanyVisibilityPrivileged()) {
            return true;
        }

        $employeeId = Auth::user()->employee_id ?? null;

        if ((string) $company->id_client_mngr === (string) $employeeId) {
            return true;
        }

        return $this->isApproverForCompany($company);
    }

    protected function canManageCompanyContracts(Company $company): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        if ($this->isContractUploadPrivileged()) {
            return true;
        }

        $employeeId = Auth::user()->employee_id ?? null;
        if (!$employeeId) {
            return false;
        }

        if ((string) $company->id_client_mngr === (string) $employeeId) {
            return true;
        }

        if ($company->sap_code) {
            return Company::query()
                ->where('status', 1)
                ->where('sap_code', $company->sap_code)
                ->where('id_client_mngr', $employeeId)
                ->exists();
        }

        return false;
    }
}