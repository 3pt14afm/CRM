<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 8 — Notification to Interrupted Approver (Courtesy Notice)
 * Recipient: The approver currently holding the project when preparer withdraws or cancels
 * Trigger: FUTURE FEATURE — Preparer withdraws or cancels the project.
 *          Controller logic is not yet implemented; this Mailable is ready for when it is.
 *
 * @param string $actionType  Either "Withdrawn" or "Cancelled"
 */
class RoiWithdrawCancelApproverMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $approverName,
        public readonly string $reference,
        public readonly string $actionType,   // "Withdrawn" | "Cancelled"
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Notice: ROI {$this->reference} was {$this->actionType}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.withdraw-cancel-approver',
        );
    }
}