<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 6 — Returned to Intermediate Approver
 * Recipient: The approver now receiving a sent-back project (Levels 2–5)
 * Trigger: Any send-back between levels where the project stays in the Current pipeline
 *
 * @param string $pendingAction  The action now required, e.g. "Review", "Check", "Endorsement"
 * @param string $higherActorName  Name of the approver who sent it back
 * @param string $comment          The note or comment left by the sender
 */
class RoiReturnedToApproverMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $approverName,
        public readonly string $reference,
        public readonly string $pendingAction,
        public readonly string $higherActorName,
        public readonly string $comment,
        public readonly string $projectUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "ROI {$this->reference} returned for {$this->pendingAction}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.returned-to-approver',
        );
    }
}