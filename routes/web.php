<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Customer\CustomerManagementController;
use App\Http\Controllers\Customer\RoiController;
use App\Http\Controllers\RoiEntryProjectController; 
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

                /**
                 * ✅ Entry landing page (LIST)
                 * Sidebar "Entry" should point here.
                 */
                Route::get('/', [RoiController::class, 'entryList'])->name('roi.entry.list');

                /**
                 * ✅ Create New Draft opens the editor (Entry.jsx)
                 */
                Route::get('/create', [RoiController::class, 'entryCreate'])->name('roi.entry.create');

                /**
                 * ✅ Open an existing draft in the editor (Entry.jsx)
                 */
                Route::get('/projects/{project}', [RoiEntryProjectController::class, 'show'])
                    ->name('roi.entry.projects.show');

                /**
                 * ✅ Save Draft (create/update)
                 */
                Route::post('/draft', [RoiEntryProjectController::class, 'saveDraft'])
                    ->name('roi.entry.draft.save');

                /**
                 * ✅ Submit (draft -> submitted)
                 */
                Route::patch('/projects/{project}/submit', [RoiEntryProjectController::class, 'submit'])
                    ->name('roi.entry.projects.submit');

                /**
                 * ✅ Print (recommend project-based so Entry.jsx pathname + "/print" works when editing)
                 * This supports printing from the editor at /projects/{project}
                 */
                Route::get('/projects/{project}/print', function ($project) {
                    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                        'tab' => request('tab', 'summary'),
                        'storageKey' => request('storageKey'),
                        'autoprint' => (bool) request('autoprint', false),
                        'project' => $project,
                    ]);
                })->name('roi.entry.projects.print');

                Route::delete('/projects/{project}', [RoiEntryProjectController::class, 'destroy'])
                    ->name('roi.entry.projects.destroy');

                /**
                 * (Optional) If you still want tab URLs, we can add them later.
                 * For now, Entry.jsx handles tabs internally, so you don't need extra routes.
                 */
            });


            Route::get('/current', [RoiController::class, 'current'])->name('roi.current');
            Route::get('/archive', [RoiController::class, 'archive'])->name('roi.archive');
        });
    });

require __DIR__.'/auth.php';
