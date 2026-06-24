<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 1 — Initial Submission Confirmation
 * Recipient: Preparer
 * Trigger: On project submission (RoiEntryProjectController::submit)
 */
class RoiSubmittedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $preparerName,
        public readonly string $reference,
        public readonly string $reviewerName,
        public readonly string $projectUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "ROI Proposal Submitted For Review: {$this->reference}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.submitted',
        );
    }
}