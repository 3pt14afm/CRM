<?php

namespace App\Services;

use App\Models\SprfActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class SprfActivityLogger
{
    public static function log(
        string $activityType,
        ?Model $sprf = null,
        ?string $details = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        string $status = 'success'
    ): void {
        $user = Auth::user();

        SprfActivityLog::create([
            'yyyymm' => now()->format('Ym'),

            'user_id' => $user?->id,
            'first_name' => $user?->first_name,
            'last_name' => $user?->last_name,
            'employee_id' => $user?->employee_id,
            'department_id' => $user?->department_id,
            'location_id' => $user?->primary_location_id,
            'position' => $user?->position,
            'email' => $user?->email,

            'sprf_entry_project_id' => $sprf?->entry_project_id ?? $sprf?->id,
            'sprf_no' => $sprf?->sprf_no,

            'prepared_by_user_id' => $sprf?->prepared_by_user_id,
            'director_customer_engagement_user_id' => $sprf?->director_customer_engagement_user_id,
            'esd_director_user_id' => $sprf?->esd_director_user_id,
            'vp_ccto_user_id' => $sprf?->vp_ccto_user_id,
            'president_ceo_user_id' => $sprf?->president_ceo_user_id,
            'current_approver_user_id' => $sprf?->current_approver_user_id,
            'approved_by_user_id' => $sprf?->approved_by_user_id,
            'rejected_by_user_id' => $sprf?->rejected_by_user_id,

            'sprf_status' => $sprf?->status,
            'current_level' => $sprf?->current_level,
            'approval_level' => $sprf?->approval_level,
            'approval_condition_code' => $sprf?->approval_condition_code,

            'sub_category' => $sprf?->sub_category,
            'account' => $sprf?->account,
            'account_manager' => $sprf?->account_manager,

            'revenue' => $sprf?->revenue,
            'cogs' => $sprf?->cogs,
            'other_expense_total' => $sprf?->other_expense_total,
            'total_expense' => $sprf?->total_expense,
            'gp_value' => $sprf?->gp_value,
            'gp_percent' => $sprf?->gp_percent,

            'module_type' => 'SPRF',
            'activity_type' => $activityType,

            'old_values' => $oldValues,
            'new_values' => $newValues,

            'activity_details' => $details,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'route_name' => request()->route()?->getName(),
            'url' => request()->path(),
            'method' => request()->method(),

            'status' => $status,
        ]);
    }
}