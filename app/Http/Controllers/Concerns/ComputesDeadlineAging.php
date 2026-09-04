<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Carbon;

trait ComputesDeadlineAging
{
    private function formatDeadlineAging(?string $deadline): ?string
    {
        if (!$deadline) {
            return null;
        }

        $today        = Carbon::today();
        $deadlineDate = Carbon::parse($deadline)->startOfDay();

        if ($deadlineDate->lt($today)) {
            return 'Overdue';
        }
        if ($deadlineDate->isToday()) {
            return 'Due today';
        }

        $days = $today->diffInDays($deadlineDate);

        if ($days <= 7) {
            return "{$days}d left";
        }

        $weeks         = intdiv($days, 7);
        $remainderDays = $days % 7;

        return $remainderDays > 0
            ? "{$weeks}w {$remainderDays}d left"
            : "{$weeks}w left";
    }
}