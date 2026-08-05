<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Contracts\Contract;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ContractUploadLogger
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

    /**
     * Generic entry point — same shape as RoiActivityLogger::log(), but
     * writes to the ActivityLog table instead of RoiActivityLog.
     */
    public static function log(
        string $activityType,
        ?string $moduleType = 'Contract',
        ?string $details = null,
        ?Model $subject = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        string $status = 'success'
    ): void {
        $user = Auth::user();

        ActivityLog::create([
            'user_id' => $user?->id,

            'first_name'    => $user?->first_name,
            'last_name'     => $user?->last_name,
            'employee_id'   => $user?->employee_id,
            'department_id' => $user?->department_id,
            'location_id'   => $user?->primary_location_id,

            'position' => $user?->position,
            'email'    => $user?->email,

            'module_type'   => $moduleType ?? 'Contract',
            'activity_type' => $activityType,

            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id'   => $subject?->id,

            'old_values' => self::cleanValues($oldValues),
            'new_values' => self::cleanValues($newValues),

            'activity_details' => $details
                ?: trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? '')) . ' performed ' . $activityType,

            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'route_name' => request()->route()?->getName(),
            'url'        => request()->path(),
            'method'     => request()->method(),

            'status' => $status,
        ]);
    }

    /**
     * A contract was uploaded successfully.
     */
    public static function uploaded(Contract $contract): void
    {
        $user = Auth::user();

        self::log(
            activityType: 'contract_upload',
            moduleType: 'Contract',
            details: trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? ''))
                . " uploaded contract \"{$contract->doc_num}\" for {$contract->company_name}",
            subject: $contract,
            newValues: [
                'company_id'   => $contract->company_id,
                'company_name' => $contract->company_name,
                'doc_num'      => $contract->doc_num,
                'start_date'   => optional($contract->start_date)->format('Y-m-d'),
                'end_date'     => optional($contract->end_date)->format('Y-m-d'),
                'pdf_path'     => $contract->pdf_path,
            ],
        );
    }

    /**
     * A contract upload attempt failed (e.g. duplicate doc_num).
     * $companyName/$docNum are passed separately since there's no persisted
     * Contract row to attach as the subject when the write never happened.
     */
    public static function uploadFailed(?string $companyName, ?string $docNum, string $reason): void
    {
        $user = Auth::user();

        self::log(
            activityType: 'contract_upload',
            moduleType: 'Contract',
            details: trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? ''))
                . " failed to upload contract"
                . ($docNum ? " \"{$docNum}\"" : '')
                . ($companyName ? " for {$companyName}" : '')
                . ": {$reason}",
            newValues: [
                'company_name' => $companyName,
                'doc_num'      => $docNum,
                'reason'       => $reason,
            ],
            status: 'failed',
        );
    }

    /**
     * A contract's end date was extended.
     */
    public static function extended(Contract $contract, ?string $previousEndDate, string $newEndDate): void
    {
        $user = Auth::user();

        self::log(
            activityType: 'contract_extend',
            moduleType: 'Contract',
            details: trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? ''))
                . " extended contract \"{$contract->doc_num}\" for {$contract->company_name}"
                . " from {$previousEndDate} to {$newEndDate}",
            subject: $contract,
            oldValues: ['effective_end_date' => $previousEndDate],
            newValues: ['effective_end_date' => $newEndDate],
        );
    }

    /**
     * A contract was terminated/cancelled by an employee while still
     * "live" (active / extended / expiring_soon). $previousStatus is
     * whatever status it was in right before termination, for the diff.
     */
    public static function terminated(Contract $contract, string $previousStatus): void
    {
        $user = Auth::user();

        self::log(
            activityType: 'contract_terminate',
            moduleType: 'Contract',
            details: trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? ''))
                . " terminated contract \"{$contract->doc_num}\" for {$contract->company_name}",
            subject: $contract,
            oldValues: ['status' => $previousStatus],
            newValues: [
                'status'         => $contract->status,
                'terminated_at'  => optional($contract->terminated_at)->format('Y-m-d H:i:s'),
                'terminated_by'  => $contract->terminated_by,
            ],
        );
    }

    /**
     * An already-expired contract was archived by an employee.
     */
    public static function archived(Contract $contract): void
    {
        $user = Auth::user();

        self::log(
            activityType: 'contract_archive',
            moduleType: 'Contract',
            details: trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? ''))
                . " archived contract \"{$contract->doc_num}\" for {$contract->company_name}",
            subject: $contract,
            oldValues: ['status' => Contract::STATUS_EXPIRED],
            newValues: [
                'status'      => $contract->status,
                'archived_at' => optional($contract->archived_at)->format('Y-m-d H:i:s'),
                'archived_by' => $contract->archived_by,
            ],
        );
    }

    /**
     * A contract was edited successfully. $before/$after should carry the
     * same set of keys (company_name, doc_num, start_date, end_date,
     * pdf_path) so the diff is easy to read in the activity log.
     */
    public static function edited(Contract $contract, array $before, array $after): void
    {
        $user = Auth::user();
        $name = trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? ''));

        $pdfReplaced = ($before['pdf_path'] ?? null) !== ($after['pdf_path'] ?? null);

        $details = $pdfReplaced
            ? "{$name} edited the PDF and details of contract \"{$contract->doc_num}\" for {$contract->company_name}"
            : "{$name} edited contract \"{$contract->doc_num}\" for {$contract->company_name}";

        self::log(
            activityType: 'contract_edit',
            moduleType: 'Contract',
            details: $details,
            subject: $contract,
            oldValues: $before,
            newValues: $after,
        );
    }

    /**
     * A contract edit attempt failed (e.g. duplicate doc_num). The Contract
     * still exists (it's an edit, not an upload), so it's passed as the
     * subject even though the write didn't take.
     */
    public static function editFailed(Contract $contract, ?string $attemptedDocNum, string $reason): void
    {
        $user = Auth::user();

        self::log(
            activityType: 'contract_edit',
            moduleType: 'Contract',
            details: trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? ''))
                . " failed to edit contract \"{$contract->doc_num}\" for {$contract->company_name}"
                . ($attemptedDocNum && $attemptedDocNum !== $contract->doc_num ? " (attempted doc_num \"{$attemptedDocNum}\")" : '')
                . ": {$reason}",
            subject: $contract,
            newValues: [
                'attempted_doc_num' => $attemptedDocNum,
                'reason'            => $reason,
            ],
            status: 'failed',
        );
    }

    /**
     * A contract's PDF was viewed/opened.
     */
    public static function viewedPdf(Contract $contract): void
    {
        $user = Auth::user();

        self::log(
            activityType: 'contract_view_pdf',
            moduleType: 'Contract',
            details: trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? ''))
                . " viewed the PDF for contract \"{$contract->doc_num}\" ({$contract->company_name})",
            subject: $contract,
        );
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