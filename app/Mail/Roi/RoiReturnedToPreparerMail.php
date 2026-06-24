<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 3 — Revisions Requested (Returned to Preparer from Level 2)
 * Recipient: Preparer
 * Trigger: Level 2 (Reviewer) sends the project back to Level 1 (Preparer)
 */
class RoiReturnedToPreparerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $preparerName,
        public readonly string $reference,
        public readonly string $reviewerName,
        public readonly string $comment,
        public readonly string $projectUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "ROI {$this->reference} Returned for Revision",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.returned-to-preparer',
        );
    }
}