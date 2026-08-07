<?php

namespace App\Models\Contracts;

use App\Models\CustomerInfo\Company;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    use HasFactory;

    /**
     * How far out from today a contract counts as "expiring soon" when it
     * hasn't already expired. Kept as a single constant so the threshold
     * lives in one place instead of being duplicated across controllers.
     */
    public const EXPIRING_SOON_MONTHS = 6;

    public const STATUS_ACTIVE        = 'active';
    public const STATUS_EXPIRING_SOON = 'expiring_soon';
    public const STATUS_EXPIRED       = 'expired';
    public const STATUS_EXTENDED      = 'extended';

    // Final, explicitly-set states triggered by an employee action rather
    // than by the passage of time. Once a contract is in one of these two
    // statuses, the date-based auto calculation below must never overwrite
    // it again — that's the whole point of "terminated"/"archived" being
    // final.
    public const STATUS_TERMINATED = 'terminated';
    public const STATUS_ARCHIVED   = 'archived';

    /**
     * Statuses that are "final" — set explicitly by a user action, never by
     * the date-based auto calculation, and never editable/extendable again
     * once set.
     */
    public const FINAL_STATUSES = [
        self::STATUS_TERMINATED,
        self::STATUS_ARCHIVED,
    ];

    protected $fillable = [
        'company_id',
        'company_name',
        'doc_num',
        'start_date',
        'end_date',
        'extend_dates',
        'status',
        'pdf_path',
        'uploader',
        'terminated_at',
        'terminated_by',
        'archived_at',
        'archived_by',
    ];

    protected $casts = [
        'start_date'    => 'date',
        'end_date'      => 'date',
        'extend_dates'  => 'array',
        'terminated_at' => 'datetime',
        'archived_at'   => 'datetime',
    ];

    protected static function booted()
    {
        // Keep `status` in sync with the underlying dates every time the
        // model is written, so the DB value never drifts out of sync with
        // end_date / extend_dates just because it wasn't recomputed manually.
        //
        // Exception: terminated / archived are final states set explicitly
        // by an employee action (see terminate()/archive() below). If the
        // in-memory status is already one of those when saving() fires, skip
        // the recompute entirely so it can never be silently clobbered back
        // to an auto-calculated date-based status.
        static::saving(function (Contract $contract) {
            if (in_array($contract->status, self::FINAL_STATUSES, true)) {
                return;
            }

            $contract->status = $contract->computeStatus();
        });
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * The most recent date the contract has been extended to, or null if
     * it has never been extended. This is what "counts" for expiry
     * purposes once extensions exist — the original end_date is preserved
     * untouched in its own column.
     */
    public function latestExtendedDate(): ?string
    {
        if (empty($this->extend_dates)) {
            return null;
        }

        return collect($this->extend_dates)
            ->pluck('date')
            ->filter()
            ->sort()
            ->last();
    }

    /**
     * Pure calculation, no side effects — figures out what `status` should
     * be right now based on end_date / extend_dates. Never returns a final
     * status (terminated/archived); those are only ever set explicitly via
     * terminate()/archive().
     */
    public function computeStatus(): string
    {
        $effectiveEnd = $this->latestExtendedDate() ?? optional($this->end_date)->format('Y-m-d');

        if (!$effectiveEnd) {
            return self::STATUS_ACTIVE;
        }

        $today = Carbon::today();
        $end   = Carbon::parse($effectiveEnd)->startOfDay();

        if ($end->lt($today)) {
            return self::STATUS_EXPIRED;
        }

        if ($end->lte($today->copy()->addMonths(self::EXPIRING_SOON_MONTHS))) {
            return self::STATUS_EXPIRING_SOON;
        }

        if (!empty($this->extend_dates)) {
            return self::STATUS_EXTENDED;
        }

        return self::STATUS_ACTIVE;
    }

    /**
     * Recompute status and persist it only if it actually changed (e.g. a
     * contract silently crossing into "expired" purely because time has
     * passed, with no explicit save triggered by a user action).
     *
     * No-ops for contracts already in a final state (terminated/archived) —
     * those never get recomputed from dates again.
     */
    public function refreshStatus(): string
    {
        if (in_array($this->status, self::FINAL_STATUSES, true)) {
            return $this->status;
        }

        $computed = $this->computeStatus();

        if ($computed !== $this->status) {
            $this->status = $computed;
            $this->saveQuietly();
        }

        return $this->status;
    }

    /**
     * True once the contract is in a final state (terminated/archived) —
     * from this point on it can only ever be viewed, never edited,
     * extended, terminated, or archived again.
     */
    public function isFinal(): bool
    {
        return in_array($this->status, self::FINAL_STATUSES, true);
    }

    /**
     * Employee-initiated cancellation. Only valid from active / extended /
     * expiring_soon — enforced by the caller (controller) before this runs.
     * $employeeId is whoever performed the action (Auth::user()->employee_id).
     */
    public function terminate($employeeId): void
    {
        $this->status         = self::STATUS_TERMINATED;
        $this->terminated_at  = now();
        $this->terminated_by  = $employeeId;
        $this->save();
    }

    /**
     * Employee-initiated archiving of an already-expired contract. Only
     * valid from expired — enforced by the caller (controller) before this
     * runs. $employeeId is whoever performed the action.
     */
    public function archive($employeeId): void
    {
        $this->status      = self::STATUS_ARCHIVED;
        $this->archived_at = now();
        $this->archived_by = $employeeId;
        $this->save();
    }
}