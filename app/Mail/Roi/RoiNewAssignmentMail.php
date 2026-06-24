<?php

namespace App\Mail\Roi;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Template 2 — New Project Assignment
 * Recipient: The next approver in the sequence (Levels 2-6)
 * Trigger: When a project is submitted or advances to their level
 *
 * @param mixed  $project         The ROI project model containing the reference
 * @param string $nextActorName   Name of the approver receiving the project
 * @param string $actorName       Name of the user who forwarded/submitted it
 * @param string $requiredAction  The action required, e.g., "Review", "Check"
 * @param string $projectUrl      Link to view the project
 */
class RoiNewAssignmentMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly mixed $project,
        public readonly string $nextActorName,
        public readonly string $actorName,
        public readonly string $requiredAction,
        public readonly string $projectUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "ROI {$this->project->reference} is ready for you to {$this->requiredAction}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.roi.new-assignment',
        );
    }
}