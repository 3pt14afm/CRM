<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoiController extends Controller
{
    public function entry(){
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry');
    }
    public function current(){
            return Inertia::render('CustomerManagement/ProjectROIApproval/Current');
        }

     public function archive(){
        return Inertia::render('CustomerManagement/ProjectROIApproval/Archived');
    }
    
}
