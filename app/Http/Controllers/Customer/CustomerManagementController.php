<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Illuminate\Http\Request;

class CustomerManagementController extends Controller
{
    public function dashboard()
    {
        return Inertia::render('CustomerManagement/Dashboard');
    }
}
