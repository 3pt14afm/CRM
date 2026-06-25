<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 2 — Project Advancement / Status Update
 * Recipient: Preparer
 * Trigger: Every time a project advances to the next level (including final Approved)
 *
 * @param string $actionTaken     "Reviewed", "Checked", "Endorsed", "Confirmed", "Approved"
 * @param string $actorName       Full name of the approver who acted
 * @param string $nextStatus      New project status, e.g. "For Checking", "Approved"
 * @param string $nextActorName   Full name of next approver, or "N/A" when Approved
 */
class RoiAdvancedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $preparerName,
        public readonly string $reference,
        public readonly string $actionTaken,
        public readonly string $actorName,
        public readonly string $nextStatus,
        public readonly string $nextActorName,
        public readonly string $projectUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Status Update: ROI {$this->reference} is now {$this->nextStatus}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.advanced',
        );
    }
}