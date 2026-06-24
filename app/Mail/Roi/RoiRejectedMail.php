<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 9 — Rejection Notification
 * Recipient: Preparer
 * Trigger: Any approver rejects the project (RoiCurrentWorkflowService::handleReject)
 *
 * @param string $actorName        Full name of the approver who rejected
 * @param string $stageOfRejection Stage label, e.g. "Review", "Check", "Endorse", "Confirm", "Approve"
 */
class RoiRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $preparerName,
        public readonly string $reference,
        public readonly string $actorName,
        public readonly string $stageOfRejection,
        public readonly string $projectUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Notice: ROI Proposal {$this->reference} Rejected",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.rejected',
        );
    }
}