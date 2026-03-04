<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AdminController; // ✅ add this
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Customer\CustomerManagementController;
use App\Http\Controllers\Customer\RoiController;
use App\Http\Controllers\RoiCurrentProjectController;
use App\Http\Controllers\RoiEntryProjectController;
use App\Http\Controllers\RoiEntryProjectNoteController;
use App\Models\User;
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

// ✅ Admin Panel
Route::middleware(['auth', 'verified', 'admin']) // ✅ add 'admin'
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {

        Route::get('/panel', function () {
            return Inertia::render('Admin/Panel');
        })->name('index');

        // Locations
        Route::get   ('locations',                  [AdminController::class, 'locationIndex'])   ->name('locations.index');
        Route::post  ('locations',                  [AdminController::class, 'locationStore'])   ->name('locations.store');
        Route::put   ('locations/{location}',       [AdminController::class, 'locationUpdate'])  ->name('locations.update');
        Route::delete('locations/{location}',       [AdminController::class, 'locationDestroy']) ->name('locations.destroy');
        Route::get   ('locations/{location}/users', [AdminController::class, 'locationUsers'])   ->name('locations.users');

        // Users
        Route::get   ('users',                      [AdminController::class, 'userIndex'])           ->name('users.index');
        Route::post  ('users',                      [AdminController::class, 'userStore'])           ->name('users.store');
        Route::put   ('users/{user}',               [AdminController::class, 'userUpdate'])          ->name('users.update');
        Route::patch ('users/{user}/locations',     [AdminController::class, 'userAssignLocations']) ->name('users.locations');
        Route::patch ('users/{user}/ban',           [AdminController::class, 'userBan'])             ->name('users.ban');
        Route::patch ('users/{user}/unban',         [AdminController::class, 'userUnban'])           ->name('users.unban');
        Route::delete('users/{user}',               [AdminController::class, 'userDestroy'])         ->name('users.destroy');
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

                Route::get('/', [RoiController::class, 'entryList'])->name('roi.entry.list');

                Route::get('/create', [RoiController::class, 'entryCreate'])->name('roi.entry.create');

                Route::get('/projects/{project}', [RoiEntryProjectController::class, 'show'])
                    ->name('roi.entry.projects.show');

                Route::post('/draft', [RoiEntryProjectController::class, 'saveDraft'])
                    ->name('roi.entry.draft.save');

                Route::patch('/entry/projects/{project}/submit', [RoiEntryProjectController::class, 'submit'])
                    ->name('roi.entry.projects.submit');

                Route::get('/projects/{project}/print', function ($project) {
                    $p = \App\Models\RoiEntryProject::with(['items','fees','user'])->findOrFail($project);

                    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                        'tab'               => request('tab', 'summary'),
                        'storageKey'        => request('storageKey'),
                        'autoprint'         => (bool) request('autoprint', false),
                        'showDraftWatermark'=> (bool) request('draftWatermark', true),
                        'entryProject'      => $p,
                    ]);
                })->name('roi.entry.projects.print');

                Route::delete('/projects/{project}', [RoiEntryProjectController::class, 'destroy'])
                    ->name('roi.entry.projects.destroy');

                Route::post('/projects/{project}/notes', [RoiEntryProjectController::class, 'storeNote'])
                    ->name('roi.entry.projects.notes.store');

                Route::post('/{project}/comments', [RoiEntryProjectController::class, 'storeComment'])
                    ->name('roi.projects.comments.store');
            });

            Route::prefix('current')->group(function () {
                Route::get('/', [RoiCurrentProjectController::class, 'current'])->name('roi.current');

                Route::patch('/{id}/send-back', [RoiCurrentProjectController::class, 'sendBack'])
                    ->name('roi.current.send-back');

                Route::get('/{id}', [RoiCurrentProjectController::class, 'show'])
                    ->name('roi.current.show');

                Route::post('/{id}/advance', [RoiCurrentProjectController::class, 'advanceProject'])
                    ->name('roi.current.advance');

                Route::post('/{id}/reject', [RoiCurrentProjectController::class, 'reject'])
                    ->name('roi.current.reject');

                Route::post('/{id}/approve', [RoiCurrentProjectController::class, 'approve'])
                    ->name('roi.current.approve');

                Route::get('/{id}/print', function ($id) {
                    $p = \App\Models\RoiCurrentProject::with(['items','fees','user'])->findOrFail($id);

                    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                        'tab'               => request('tab', 'summary'),
                        'storageKey'        => request('storageKey'),
                        'autoprint'         => (bool) request('autoprint', false),
                        'showDraftWatermark'=> false,
                        'entryProject'      => $p,
                    ]);
                })->name('roi.current.print');
            });

            Route::get('/archive', [RoiController::class, 'archive'])->name('roi.archive');

            Route::get('/archive/{id}', [RoiController::class, 'archiveShow'])->name('roi.archive.show');

            Route::get('/archive/{id}/print', function ($id) {
                $p = \App\Models\RoiArchiveProject::with(['items', 'fees', 'user'])->findOrFail($id);

                $ids = collect([
                    $p->user_id,
                    $p->reviewed_by_id ?? null,
                    $p->checked_by_id ?? null,
                    $p->endorsed_by_id ?? null,
                    $p->confirmed_by_id ?? null,
                    $p->approved_by ?? null,
                    $p->rejected_by ?? null,
                ])->filter()->unique()->values();

                $usersById = User::whereIn('id', $ids)
                    ->get(['id', 'name'])
                    ->keyBy('id')
                    ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]);

                return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                    'route'             => 'archive',
                    'tab'               => request('tab', 'summary'),
                    'storageKey'        => request('storageKey'),
                    'autoprint'         => (bool) request('autoprint', false),
                    'showDraftWatermark'=> false,
                    'entryProject'      => $p,
                    'usersById'         => $usersById,
                ]);
            })->name('roi.archive.print');
        });
    });

require __DIR__ . '/auth.php';