<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\RoiEntryProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RoiController extends Controller
{
    /**
     * ENTRY landing = list of drafts (EntryList.jsx)
     */
    public function entryList(Request $request)
    {
        $userId = Auth::id();

        // 5 matches your UI mock; can be overridden by ?per_page=
        $perPage = (int) $request->input('per_page', 5);

        $draftsQuery = RoiEntryProject::query()
            ->where('user_id', $userId)
            ->where('status', 'draft')
            ->orderByDesc('last_saved_at')
            ->orderByDesc('updated_at');

        $drafts = (clone $draftsQuery)
            ->paginate($perPage)
            ->withQueryString();

        $totalDrafts = (clone $draftsQuery)->count();

        $recentlyModifiedToday = RoiEntryProject::query()
            ->where('user_id', $userId)
            ->where('status', 'draft')
            ->whereDate('last_saved_at', now()->toDateString())
            ->count();

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/EntryList', [
            'drafts' => $drafts->through(function (RoiEntryProject $p) {
                $last = $p->last_saved_at; // casted to datetime in model
                $display = null;

                if ($last) {
                    $now = now();

                    $diffMinutes = (int) $last->diffInMinutes($now); // integer
                    $diffHours   = (int) $last->diffInHours($now);   // integer
                    $diffDays    = (int) $last->diffInDays($now);    // integer

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

                return [
                    'id' => $p->id,
                    'reference' => $p->reference,
                    'company_name' => $p->company_name,
                    'contract_years' => $p->contract_years,
                    'contract_type'  => $p->contract_type,
                    'last_saved_display' => $display,
                ];
            }),
            'stats' => [
                'totalDrafts' => $totalDrafts,
                'recentlyModifiedText' => $recentlyModifiedToday . ' Today',
            ],
        ]);
    }

    /**
     * Optional alias
     */
    public function entry(Request $request)
    {
        return $this->entryList($request);
    }

    /**
     * Create new draft = open editor (Entry.jsx) without an existing project
     */
    public function entryCreate()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Machine Configuration',
            'entryProject' => null,
        ]);
    }

    // Keep these for now
    public function entryMachine()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Machine Configuration'
        ]);
    }

    public function entrySummary()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Summary'
        ]);
    }

    public function entrySucceeding()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Succeeding'
        ]);
    }

    public function current()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Current');
    }

    public function archive()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Archived');
    }
}
