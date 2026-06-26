<?php

namespace App\Mail\Admin;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Password Reset notification.
 *
 * Sent whenever a password is reset to the default — by the user themselves
 * or by an administrator. The $resetByAdmin flag only affects one line of
 * text in the email body; everything else is identical.
 */
class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $userName,
        public readonly string $defaultPassword,
        public readonly string $loginUrl,
        public readonly bool   $resetByAdmin,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your Password Has Been Reset');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.admin.password-reset');
    }
}