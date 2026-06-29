<?php

namespace App\Mail\SPRF;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Recipient: Approver whose queue is affected
 *
 * Covers templates:
 *   queued     → #2  Action Required
 *   sent_back  → #9  Returned for Re-evaluation
 *   withdrawn  → #12 Withdrawn notice
 *   cancelled  → #12 Cancelled notice
 */
class SprfApproverQueueNotification extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param string      $type         queued | sent_back | withdrawn | cancelled
     * @param string      $referenceNo
     * @param array       $data         queued     → senderName, action ('review'|'approval')
     *                                  sent_back  → actorName
     *                                  withdrawn  → pmName
     *                                  cancelled  → pmName
     * @param string|null $projectLink  null for 'withdrawn'
     */
    public function __construct(
        public readonly string $type,
        public readonly string $referenceNo,
        public readonly array $data,
        public readonly ?string $projectLink,
    ) {}

    public function envelope(): Envelope
    {
        $subject = match ($this->type) {
            'queued'    => "Action Required: SPRF {$this->referenceNo}",
            'sent_back' => "Returned for Re-evaluation: SPRF {$this->referenceNo}",
            'withdrawn' => "Notice: SPRF {$this->referenceNo} Withdrawn",
            'cancelled' => "Notice: SPRF {$this->referenceNo} Cancelled",
            default     => "SPRF Queue Update: {$this->referenceNo}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.sprf.approver-queue-notification');
    }
}