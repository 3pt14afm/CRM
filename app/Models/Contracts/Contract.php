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
    ];

    protected $casts = [
        'start_date'   => 'date',
        'end_date'     => 'date',
        'extend_dates' => 'array',
    ];

    protected static function booted()
    {
        // Keep `status` in sync with the underlying dates every time the
        // model is written, so the DB value never drifts out of sync with
        // end_date / extend_dates just because it wasn't recomputed manually.
        static::saving(function (Contract $contract) {
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
     * be right now based on end_date / extend_dates.
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

        if (!empty($this->extend_dates)) {
            return self::STATUS_EXTENDED;
        }

        if ($end->lte($today->copy()->addMonths(self::EXPIRING_SOON_MONTHS))) {
            return self::STATUS_EXPIRING_SOON;
        }

        return self::STATUS_ACTIVE;
    }

    /**
     * Recompute status and persist it only if it actually changed (e.g. a
     * contract silently crossing into "expired" purely because time has
     * passed, with no explicit save triggered by a user action).
     */
    public function refreshStatus(): string
    {
        $computed = $this->computeStatus();

        if ($computed !== $this->status) {
            $this->status = $computed;
            $this->saveQuietly();
        }

        return $this->status;
    }
}