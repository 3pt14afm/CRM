<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Proposal extends Model
{
    protected $table = 'proposals';

    protected $fillable = [
        'roi_archive_project_id',
        'user_id',
        'status',

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
        'unit_price' => 'decimal:6',
        // 'specs' => 'array' removed — specs now stores a base64 image string, like printer_image
    ];

    // ─── Relationships ────────────────────────────────────────────

    public function roiArchiveProject(): BelongsTo
    {
        return $this->belongsTo(RoiArchiveProject::class, 'roi_archive_project_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(RoiArchiveProject::class, 'roi_archive_project_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isGenerated(): bool
    {
        return $this->status === 'generated';
    }
}