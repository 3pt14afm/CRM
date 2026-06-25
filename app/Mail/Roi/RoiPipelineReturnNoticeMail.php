<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 4 — Pipeline Return Notification (Informational — No Action Required)
 * Recipient: Preparer
 * Trigger: Any send-back between Levels 3–6 (i.e. the project stays in the Current pipeline,
 *          it is NOT returned all the way to the Preparer's entry queue)
 *
 * @param string $higherActorName  Full name of the approver who sent back
 * @param string $lowerActorName   Full name of the approver now receiving the project
 * @param string $currentStatus    Current project status after the send-back
 * @param string $comment          The note or comment left by the sender
 */
class RoiPipelineReturnNoticeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $preparerName,
        public readonly string $reference,
        public readonly string $higherActorName,
        public readonly string $lowerActorName,
        public readonly string $currentStatus,
        public readonly string $comment,
        public readonly string $projectUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Status Update: ROI {$this->reference} Returned to {$this->lowerActorName} {$this->currentStatus}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.pipeline-return-notice',
        );
    }
}