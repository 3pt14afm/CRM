<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 7 — Preparer Action Confirmed (Withdraw / Cancel)
 * Recipient: Preparer
 * Trigger: FUTURE FEATURE — Preparer withdraws or cancels the project.
 *          Controller logic is not yet implemented; this Mailable is ready for when it is.
 *
 * @param string $actionType  Either "Withdrawn" or "Cancelled"
 */
class RoiWithdrawCancelPreparerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $preparerName,
        public readonly string $reference,
        public readonly string $actionType,   // "Withdrawn" | "Cancelled"
        public readonly string $projectUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Confirmed: ROI {$this->reference} {$this->actionType}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.withdraw-cancel-preparer',
        );
    }
}