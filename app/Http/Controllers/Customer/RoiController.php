<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoiController extends Controller
{
    // Main Entry (Defaults to Machine Config)
    public function entry() {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Machine Configuration'
        ]);
    }

    public function entryMachine() {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Machine Configuration'
        ]);
    }

    public function entrySummary() {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Summary'
        ]);
    }

    public function entrySucceeding() {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Succeeding'
        ]);
    }

    public function current() {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Current');
    }

    public function archive() {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Archived');
    }
}