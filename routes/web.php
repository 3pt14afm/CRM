<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Customer\CustomerManagementController;
use App\Http\Controllers\Customer\RoiController;
use Inertia\Inertia;

// Route::get('/', function () {
//     return Inertia::render('Welcome', [
//         'canLogin' => Route::has('login'),
//         'canRegister' => Route::has('register'),
//         'laravelVersion' => Application::VERSION,
//         'phpVersion' => PHP_VERSION,
//     ]);
// });

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('Dashboard')
        : redirect()->route('login');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});


Route::prefix('customer-management')->group(function () {
    
    // The Module Dashboard (The summary page)
    Route::get('/dashboard', [CustomerManagementController::class, 'dashboard'])
        ->name('customers.dashboard');

    // Customer Details
    Route::get('/details', [CustomerManagementController::class, 'details'])
        ->name('customers.details');

    // ROI Sub-group
    Route::prefix('roi')->group(function () {
        Route::get('/entry', [RoiController::class, 'entry'])->name('roi.entry');
        Route::get('/current', [RoiController::class, 'current'])->name('roi.current');
        Route::get('/archive', [RoiController::class, 'archive'])->name('roi.archive');
    });

    
    
    // Add other routes here (Proposals, Sales Log, etc.)
});
require __DIR__.'/auth.php';
