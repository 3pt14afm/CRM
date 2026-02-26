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
    $user = Auth::user();
    $isReviewer = $user->role === 'reviewer';

    $query = RoiCurrentProject::with(['items', 'fees', 'user'])
        ->orderBy('last_saved_at', 'desc');

    if (!$isReviewer) {
        $query->where('user_id', $user->id);
    }

    $currentProjects = $query->paginate(10)
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

    $recentlyAddedToday = RoiCurrentProject::query()
        ->when(!$isReviewer, fn($q) => $q->where('user_id', $user->id))
        ->whereDate('last_saved_at', now()->toDateString())
        ->count();

    $stats = [
        'totalCurrentProjects' => RoiCurrentProject::query()
            ->when(!$isReviewer, fn($q) => $q->where('user_id', $user->id))
            ->count(),
        'recentlyModifiedText' => optional(
            RoiCurrentProject::query()
                ->when(!$isReviewer, fn($q) => $q->where('user_id', $user->id))
                ->orderBy('last_saved_at', 'desc')
                ->first()
        )->last_saved_at?->diffForHumans() ?? '—',
        'recentlyAddedToday' => $recentlyAddedToday . ' Today',
    ];

    return Inertia::render('CustomerManagement/ProjectROIApproval/CurrentRoutes/CurrentList', [
        'currentProjects' => $currentProjects,
        'stats'           => $stats,
    ]);
}
public function show($id)
{
    $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
        'project' => $project,
        'entryProject' => $project,
        'readOnly'     => true,
        'route'        => 'current',
        'createdBy'    => $project->user->name,
        'role'         => Auth::user()->role,
    ]);
}

public function sendBack($id)
{
    return DB::transaction(function () use ($id) {
        // 1. SELECT: Get the 'Current' project with all its sub-data
        $current = RoiCurrentProject::with(['items', 'fees'])->findOrFail($id);

        // 2. COPY: Prepare the data for the 'Entry' (Drafts) table
        $data = $current->toArray();
        
        // Change the status to draft and set the timestamp
        $data['status'] = 'returned';
        $data['last_saved_at'] = now();
        $data['reviewed_by'] = Auth::user()->name;

        // 3. SEND TO DRAFT: Create the record in RoiEntryProject
        // updateOrCreate ensures we don't get 'duplicate entry' errors
        $draft = RoiEntryProject::updateOrCreate(
            ['reference' => $current->reference], 
            $data
        );

        // 4. COPY & MOVE CHILDREN (Items and Fees)
        // We clear existing draft items/fees and replace them with the current ones
        $draft->items()->delete();
        foreach ($current->items as $item) {
            $itemData = $item->toArray();
            unset($itemData['id'], $itemData['roi_current_project_id']); 
            $draft->items()->create($itemData);
        }

        $draft->fees()->delete();
        foreach ($current->fees as $fee) {
            $feeData = $fee->toArray();
            unset($feeData['id'], $feeData['roi_current_project_id']);
            $draft->fees()->create($feeData);
        }

        // 5. DELETE: Now that the draft is safe, remove the current project
        $current->delete();

        // Redirect back with a success message
        return to_route('roi.current')->with('success', 'Project successfully moved back to drafts.');
    });
}

public function advanceProject($id)
{
    return DB::transaction(function () use ($id) {
        $project = RoiCurrentProject::with(['items', 'fees'])->findOrFail($id);
        $user = Auth::user();
        $role = strtolower($user->role);

        $workflow = [
            'reviewer'  => ['status' => 'For Checking',    'column' => 'reviewed_by'],
            'checker'   => ['status' => 'For Endorsement', 'column' => 'checked_by'],
            'endorser'  => ['status' => 'For Confirmation','column' => 'endorsed_by'],
            'confirmer' => ['status' => 'For Approval',    'column' => 'confirmed_by'],
            'approver'  => ['status' => 'Approved',        'column' => 'approved_by'],
        ];

        if (!isset($workflow[$role])) {
            return back()->withErrors(['role' => 'Unauthorized role: ' . $role]);
        }

        $step = $workflow[$role];

        // FIX: Changed $step['next_status'] to $step['status']
        $project->update([
            'status'        => $step['status'], 
            $step['column'] => $user->name,
            'last_saved_at' => now(),
        ]);

        return to_route('roi.current')->with('success', "Project moved to: " . $step['status']);
    });
}


}