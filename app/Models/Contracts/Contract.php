<?php

namespace App\Models\Contracts;

use App\Models\CustomerInfo\Company;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    use HasFactory;

    public const EXPIRING_SOON_MONTHS = 6;

    public const STATUS_ACTIVE        = 'active';
    public const STATUS_EXPIRING_SOON = 'expiring_soon';
    public const STATUS_EXPIRED       = 'expired';
    public const STATUS_EXTENDED      = 'extended';

    public const STATUS_TERMINATED = 'terminated';
    public const STATUS_ARCHIVED   = 'archived';

    public const FINAL_STATUSES = [
        self::STATUS_TERMINATED,
        self::STATUS_ARCHIVED,
    ];

    protected $fillable = [
        'company_id',
        'company_name',
        'doc_num',
        'ctid',
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

    public function isFinal(): bool
    {
        return in_array($this->status, self::FINAL_STATUSES, true);
    }

    public function terminate($employeeId): void
    {
        $this->status         = self::STATUS_TERMINATED;
        $this->terminated_at  = now();
        $this->terminated_by  = $employeeId;
        $this->save();
    }

    public function archive($employeeId): void
    {
        $this->status      = self::STATUS_ARCHIVED;
        $this->archived_at = now();
        $this->archived_by = $employeeId;
        $this->save();
    }

    public function contractType()
    {
        return $this->belongsTo(ContractType::class, 'ctid', 'id');
    }
}