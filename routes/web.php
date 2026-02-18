<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Customer\CustomerManagementController;
use App\Http\Controllers\Customer\RoiController;
use App\Http\Controllers\RoiEntryProjectController; // ✅ ADD THIS
use Inertia\Inertia;

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('customers.dashboard')
        : redirect()->route('login');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth', 'verified'])
    ->prefix('customer-management')
    ->group(function () {

        Route::get('/dashboard', [CustomerManagementController::class, 'dashboard'])
            ->name('customers.dashboard');

        Route::get('/details', [CustomerManagementController::class, 'details'])
            ->name('customers.details');

        Route::prefix('roi')->group(function () {

            // Entry Sub-menus
            Route::prefix('entry')->group(function () {
                Route::get('/', [RoiController::class, 'entry'])->name('roi.entry');
                Route::get('/machine-config', [RoiController::class, 'entryMachine'])->name('roi.entry.machine');
                Route::get('/summary-first-year', [RoiController::class, 'entrySummary'])->name('roi.entry.summary');
                Route::get('/succeeding-years', [RoiController::class, 'entrySucceeding'])->name('roi.entry.succeeding');

                Route::get('/print', function () {
                    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                        'tab' => request('tab', 'summary'),
                        'storageKey' => request('storageKey'),
                        'autoprint' => (bool) request('autoprint', false),
                    ]);
                })->name('roi.entry.print');

                //  Create/update on Save Draft ROUTES
                Route::post('/draft', [RoiEntryProjectController::class, 'saveDraft'])
                    ->name('roi.entry.draft.save');

                Route::get('/projects/{project}', [RoiEntryProjectController::class, 'show'])
                    ->name('roi.entry.projects.show');

                Route::patch('/projects/{project}/submit', [RoiEntryProjectController::class, 'submit'])
                    ->name('roi.entry.projects.submit');
            });

            Route::get('/current', [RoiController::class, 'current'])->name('roi.current');
            Route::get('/archive', [RoiController::class, 'archive'])->name('roi.archive');
        });
    });

require __DIR__.'/auth.php';
