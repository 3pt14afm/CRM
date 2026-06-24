<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 5 — Action Confirmation
 * Recipient: The approver who just performed an action (advance, send-back, approve, reject)
 * Trigger: After any workflow action by an approver
 *
 * @param string $actionTaken  Past-tense description, e.g. "Reviewed", "Sent Back", "Rejected"
 * @param string $newStatus    Resulting project status, e.g. "For Checking", "Rejected"
 * @param string $routedTo     Name of the next recipient, or "System Archive" for terminal actions
 */
class RoiActionConfirmedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $approverName,
        public readonly string $reference,
        public readonly string $actionTaken,
        public readonly string $newStatus,
        public readonly string $routedTo,
        public readonly string $projectUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Confirmation: ROI {$this->reference} successfully {$this->actionTaken}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.action-confirmed',
        );
    }
}