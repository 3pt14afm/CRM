<?php

namespace App\Models;

use App\Models\SPRF\SprfArchiveProject;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Proposal extends Model
{
    protected $table = 'proposals';

    protected $fillable = [
        'roi_archive_project_id',
        'sprf_archive_project_id',
        'project_type', // 'roi' | 'sprf'
        'user_id',
        'status',
        'generated_at',
        'archived_at',

        // Client info
        'company_name',
        'attention',
        'designation',
        'email',
        'mobile',

        // Content
        'message',
        'specs',
        'printer_image',
        'unit_price',
        'terms_text',
        'closing_text',

        // Signatures
        'user_signature',
        'conforme_name',
        'conforme_signature',
    ];

    protected $casts = [
        'unit_price'   => 'decimal:6',
        'generated_at' => 'datetime',
        'archived_at'  => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────

    public function roiArchiveProject(): BelongsTo
    {
        return $this->belongsTo(RoiArchiveProject::class, 'roi_archive_project_id');
    }

    public function sprfArchiveProject(): BelongsTo
    {
        return $this->belongsTo(SprfArchiveProject::class, 'sprf_archive_project_id');
    }

    /** @deprecated kept for backward compatibility, use roiArchiveProject() */
    public function project(): BelongsTo
    {
        return $this->belongsTo(RoiArchiveProject::class, 'roi_archive_project_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ─── Status Helpers ─────────────────────────────────────────

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isGenerated(): bool
    {
        return $this->status === 'generated';
    }

    public function isAwarded(): bool
    {
        return $this->status === 'awarded';
    }

    public function isClosed(): bool
    {
        return $this->status === 'closed';
    }

    public function isArchived(): bool
    {
        return in_array($this->status, ['awarded', 'closed'], true);
    }

    public function isRoi(): bool
    {
        return $this->project_type === 'roi';
    }

    public function isSprf(): bool
    {
        return $this->project_type === 'sprf';
    }

    /**
     * Whichever archive project this proposal is attached to, regardless of type.
     */
    public function resolveProject(): RoiArchiveProject|SprfArchiveProject|null
    {
        return $this->isSprf() ? $this->sprfArchiveProject : $this->roiArchiveProject;
    }

    // ─── Aging Helpers ────────────────────────────────────────────

    /**
     * Seconds between generation and archiving (awarded/closed). If still
     * generated and not yet archived, aging is ongoing — measured against now().
     * Returns null if the proposal was never generated (still a draft).
     */
    public function agingSeconds(): ?int
    {
        if (!$this->generated_at) {
            return null;
        }

        $end = $this->archived_at ?? now();

        return $this->generated_at->diffInSeconds($end);
    }

    /**
     * Human-readable "Xd Xh Xm" breakdown, e.g. "3d 4h 12m".
     */
    public function agingDisplay(): ?string
    {
        $seconds = $this->agingSeconds();

        if ($seconds === null) {
            return null;
        }

        $days    = intdiv($seconds, 86400);
        $hours   = intdiv($seconds % 86400, 3600);
        $minutes = intdiv($seconds % 3600, 60);

        $parts = [];
        if ($days > 0)    $parts[] = "{$days}d";
        if ($hours > 0)   $parts[] = "{$hours}h";
        if ($minutes > 0 || empty($parts)) $parts[] = "{$minutes}m";

        return implode(' ', $parts);
    }
}