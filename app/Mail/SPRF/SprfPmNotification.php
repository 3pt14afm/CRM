<?php

namespace App\Mail\SPRF;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Recipient: PM Incharge
 *
 * Covers templates:
 *   submitted  → #1  SPRF Submitted
 *   advanced   → #3  Status Update (reviewed / approved)
 *   rejected   → #5  Disapproved
 *   returned   → #7  Returned for Revision
 *   withdrawn  → #11 Withdrawn
 *   cancelled  → #11 Cancelled
 */
class SprfPmNotification extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param string      $type         submitted | advanced | rejected | returned | withdrawn | cancelled
     * @param string      $referenceNo
     * @param array       $data         submitted  → approverName, approverRole
     *                                  advanced   → approverName, action, statusDetail
     *                                  rejected   → rejectorName
     *                                  returned   → approverName
     *                                  withdrawn  → (none)
     *                                  cancelled  → (none)
     * @param string|null $projectLink  null only for 'withdrawn'
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
            'submitted' => "SPRF Submitted: {$this->referenceNo}",
            'advanced'  => "Status Update: SPRF {$this->referenceNo} " . ucfirst($this->data['action'] ?? 'Reviewed'),
            'rejected'  => "Disapproved: SPRF {$this->referenceNo}",
            'returned'  => "Returned for Revision: SPRF {$this->referenceNo}",
            'withdrawn' => "Confirmation: SPRF {$this->referenceNo} Withdrawn",
            'cancelled' => "Confirmation: SPRF {$this->referenceNo} Cancelled",
            'sent_back_inform' => "Status Update: SPRF {$this->referenceNo} Returned for Re-evaluation",
            default     => "SPRF Update: {$this->referenceNo}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.sprf.pm-notification');
    }
}