<?php

namespace App\Http\Controllers;

use App\Models\RoiCurrentProject;
use App\Models\RoiEntryProject;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryFee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;


class RoiCurrentProjectController extends Controller {

public function current()
{
    $currentProjects = RoiCurrentProject::with(['items', 'fees', 'user'])
        ->orderBy('last_saved_at', 'desc')
        ->paginate(10)
        ->through(function ($p) {
            $last = $p->last_saved_at;
            $display = null;

            if ($last) {
                $now = now();

                $diffMinutes = (int) $last->diffInMinutes($now);
                $diffHours   = (int) $last->diffInHours($now);
                $diffDays    = (int) $last->diffInDays($now);

                if ($diffDays >= 2) {
                    $display = $last->format('m/d/y');
                } elseif ($diffDays >= 1) {
                    $display = '1d ago';
                } elseif ($diffHours >= 1) {
                    $display = $diffHours . 'hr ago';
                } elseif ($diffMinutes >= 1) {
                    $display = $diffMinutes . ' minute' . ($diffMinutes === 1 ? '' : 's') . ' ago';
                } else {
                    $display = 'just now';
                }
            }

            $p->last_saved_display = $display ?? '—';
            return $p;
        });

    $stats = [
        'totalCurrentProjects' => RoiCurrentProject::count(),
        'recentlyModifiedText' => optional(
            RoiCurrentProject::orderBy('last_saved_at', 'desc')->first()
        )->last_saved_at?->diffForHumans() ?? '—',
    ];

    return Inertia::render('CustomerManagement/ProjectROIApproval/CurrentRoutes/CurrentList', [
        'currentProjects' => $currentProjects,
        'stats'           => $stats,
    ]);
}

public function show($id){
    $project = RoiCurrentProject::findOrFail($id);
    
    return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
        'entryProject' => $project,
        'readOnly' => true
    ]);
}
}


