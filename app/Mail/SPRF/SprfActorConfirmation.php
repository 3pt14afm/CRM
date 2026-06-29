<?php

namespace App\Mail\SPRF;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Recipient: The approver who just performed an action
 *
 * Covers templates:
 *   advanced          → #4  Confirmation: Reviewed / Approved
 *   rejected          → #6  Confirmation: Disapproved
 *   returned_to_entry → #8  Confirmation: Returned (sent back to PM)
 *   sent_back         → #10 Confirmation: Returned (sent back within pipeline)
 */
class SprfActorConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param string $type         advanced | rejected | returned_to_entry | sent_back
     * @param string $referenceNo
     * @param array  $data         advanced          → action, statusDetail
     *                             rejected          → (none)
     *                             returned_to_entry → pmName
     *                             sent_back         → receiverName
     * @param string $projectLink  always required
     */
    public function __construct(
        public readonly string $type,
        public readonly string $referenceNo,
        public readonly array $data,
        public readonly string $projectLink,
    ) {}

    public function envelope(): Envelope
    {
        $subject = match ($this->type) {
            'advanced'          => "Confirmation: SPRF {$this->referenceNo} " . ucfirst($this->data['action'] ?? 'Reviewed'),
            'rejected'          => "Confirmation: SPRF {$this->referenceNo} Disapproved",
            'returned_to_entry' => "Confirmation: SPRF {$this->referenceNo} Returned",
            'sent_back'         => "Confirmation: SPRF {$this->referenceNo} Returned",
            default             => "Confirmation: SPRF {$this->referenceNo}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.sprf.actor-confirmation');
    }
}