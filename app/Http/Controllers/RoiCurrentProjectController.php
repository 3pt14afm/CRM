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
     // We add 'user' to the 'with' array
     // Remove the ->where('user_id', Auth::id()) part so any auth user can see the current listings
    $projects = RoiCurrentProject::with(['items', 'fees', 'user']) 
        ->orderBy('last_saved_at', 'desc')
        ->get();

    return Inertia::render('CustomerManagement/ProjectROIApproval/Current', [
        'projects' => $projects
    ]);
    }

}


