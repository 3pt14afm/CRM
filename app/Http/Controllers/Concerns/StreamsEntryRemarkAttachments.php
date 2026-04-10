<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Storage;

trait StreamsEntryRemarkAttachments
{
    protected function streamEntryRemarkAttachment(array $attachments, string $attachmentId)
    {
        $attachment = collect($attachments)->firstWhere('id', $attachmentId);

        abort_unless($attachment && !empty($attachment['path']), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        $absolutePath = Storage::disk('local')->path($attachment['path']);
        $filename = $attachment['original_name'] ?? basename($absolutePath);

        return response()->file($absolutePath, [
            'Content-Disposition' => 'inline; filename="' . addslashes($filename) . '"',
        ]);
    }
}