<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\ApproverMatrixController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\LocationController;
use App\Http\Controllers\Admin\PositionController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Customer\CustomerManagementController;
use App\Http\Controllers\Customer\ProposalController;
use App\Http\Controllers\Customer\RoiController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoiCurrentProjectController;
use App\Http\Controllers\RoiEntryProjectController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
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

/*
|--------------------------------------------------------------------------
| Admin Panel
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/panel', function () {
            return redirect()->route('admin.location-master.index');
        })->name('index');

        // Admin pages
        Route::get('/location-master', [LocationController::class, 'locationMaster'])->name('location-master.index');
        Route::get('/department-master', [DepartmentController::class, 'departmentMaster'])->name('department-master.index');
        Route::get('/position-master', [PositionController::class, 'positionMaster'])->name('position-master.index');
        Route::get('/user-management', [UserController::class, 'userManagement'])->name('user-management.index');
        Route::get('/approver-matrix', [ApproverMatrixController::class, 'index'])->name('approver-matrix.index');
        Route::get('/user-group-access-rights', [AdminController::class, 'userGroupAccessRights'])->name('user-group-access-rights.index');
        Route::get('/user-access-rights', [AdminController::class, 'userAccessRights'])->name('user-access-rights.index');
        Route::get('/audit-logs', [AdminController::class, 'auditLogs'])->name('audit-logs.index');

        // Locations CRUD
        Route::get('/locations', [LocationController::class, 'locationIndex'])->name('locations.index');
        Route::post('/locations', [LocationController::class, 'locationStore'])->name('locations.store');
        Route::put('/locations/{location}', [LocationController::class, 'locationUpdate'])->name('locations.update');
        Route::patch('/locations/{location}/activate', [LocationController::class, 'locationActivate'])->name('locations.activate');
        Route::patch('/locations/{location}/deactivate', [LocationController::class, 'locationDeactivate'])->name('locations.deactivate');
        Route::delete('/locations/{location}', [LocationController::class, 'locationDestroy'])->name('locations.destroy');
        Route::get('/locations/{location}/users', [LocationController::class, 'locationUsers'])->name('locations.users');

        // Departments CRUD
        Route::get('/departments', [DepartmentController::class, 'departmentIndex'])->name('departments.index');
        Route::post('/departments', [DepartmentController::class, 'departmentStore'])->name('departments.store');
        Route::put('/departments/{department}', [DepartmentController::class, 'departmentUpdate'])->name('departments.update');
        Route::patch('/departments/{department}/activate', [DepartmentController::class, 'departmentActivate'])->name('departments.activate');
        Route::patch('/departments/{department}/deactivate', [DepartmentController::class, 'departmentDeactivate'])->name('departments.deactivate');

        // Positions CRUD
        Route::get('/positions', [PositionController::class, 'positionIndex'])->name('positions.index');
        Route::post('/positions', [PositionController::class, 'positionStore'])->name('positions.store');
        Route::put('/positions/{position}', [PositionController::class, 'positionUpdate'])->name('positions.update');
        Route::patch('/positions/{position}/activate', [PositionController::class, 'positionActivate'])->name('positions.activate');
        Route::patch('/positions/{position}/deactivate', [PositionController::class, 'positionDeactivate'])->name('positions.deactivate');

        // Users CRUD
        Route::get('/users', [UserController::class, 'userIndex'])->name('users.index');
        Route::post('/users', [UserController::class, 'userStore'])->name('users.store');
        Route::put('/users/{user}', [UserController::class, 'userUpdate'])->name('users.update');
        Route::patch('/users/{user}/locations', [UserController::class, 'userAssignLocations'])->name('users.locations');
        Route::patch('/users/{user}/ban', [UserController::class, 'userBan'])->name('users.ban');
        Route::patch('/users/{user}/unban', [UserController::class, 'userUnban'])->name('users.unban');
        Route::delete('/users/{user}', [UserController::class, 'userDestroy'])->name('users.destroy');

        // Approver Matrix CRUD
        Route::post('/approver-matrix', [ApproverMatrixController::class, 'store'])->name('approver-matrix.store');
        Route::put('/approver-matrix/{locationDepartment}', [ApproverMatrixController::class, 'update'])->name('approver-matrix.update');

        // Company Directory endpoints
        Route::get('/directory/departments', [DepartmentController::class, 'departments'])->name('directory.departments');
        Route::get('/directory/positions', [PositionController::class, 'positions'])->name('directory.positions');
        Route::get('/directory/employees', [UserController::class, 'employeesByPosition'])->name('directory.employees');
        Route::post('/users/assign-employee', [UserController::class, 'assignEmployeeUser'])->name('users.assign-employee');
    });

/*
|--------------------------------------------------------------------------
| Customer Management
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])
    ->prefix('customer-management')
    ->group(function () {
        Route::get('/dashboard', [CustomerManagementController::class, 'dashboard'])
            ->name('customers.dashboard');

        Route::get('/details', [CustomerManagementController::class, 'details'])
            ->name('customers.details');

        /*
        |--------------------------------------------------------------------------
        | ROI Approval Module
        |--------------------------------------------------------------------------
        | Entry / Current / Archive stays.
        | Current approval actions are still temporary until Approver Matrix replaces
        | the hardcoded workflow runtime.
        */
        Route::prefix('roi')->group(function () {

            /*
            |--------------------------------------------------------------------------
            | Entry
            |--------------------------------------------------------------------------
            */
            Route::prefix('entry')->group(function () {
                Route::get('/', [RoiController::class, 'entryList'])->name('roi.entry.list');
                Route::get('/create', [RoiController::class, 'entryCreate'])->name('roi.entry.create');

                Route::post('/draft', [RoiEntryProjectController::class, 'saveDraft'])
                    ->name('roi.entry.draft.save');

                Route::get('/projects/{project}', [RoiEntryProjectController::class, 'show'])
                    ->name('roi.entry.projects.show');

                Route::patch('/projects/{project}/submit', [RoiEntryProjectController::class, 'submit'])
                    ->name('roi.entry.projects.submit');

                Route::delete('/projects/{project}', [RoiEntryProjectController::class, 'destroy'])
                    ->name('roi.entry.projects.destroy');

                Route::post('/projects/{project}/notes', [RoiEntryProjectController::class, 'storeNote'])
                    ->name('roi.entry.projects.notes.store');

                Route::post('/projects/{project}/comments', [RoiEntryProjectController::class, 'storeComment'])
                    ->name('roi.projects.comments.store');

                Route::get('/projects/{project}/print', function ($project) {
                    $p = \App\Models\RoiEntryProject::with(['items', 'fees', 'user'])->findOrFail($project);

                    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                        'tab' => request('tab', 'summary'),
                        'storageKey' => request('storageKey'),
                        'autoprint' => (bool) request('autoprint', false),
                        'showDraftWatermark' => (bool) request('draftWatermark', true),
                        'entryProject' => $p,
                    ]);
                })->name('roi.entry.projects.print');
            });

            /*
            |--------------------------------------------------------------------------
            | Current
            |--------------------------------------------------------------------------
            | These actions are temporary runtime workflow actions.
            | Later, Approver Matrix + resolved approvers will drive them.
            */
            Route::prefix('current')->group(function () {
                Route::get('/', [RoiCurrentProjectController::class, 'current'])
                    ->name('roi.current');

                Route::get('/{id}', [RoiCurrentProjectController::class, 'show'])
                    ->name('roi.current.show');

                Route::patch('/{id}/send-back', [RoiCurrentProjectController::class, 'sendBack'])
                    ->name('roi.current.send-back');

                Route::post('/{id}/advance', [RoiCurrentProjectController::class, 'advanceProject'])
                    ->name('roi.current.advance');

                Route::post('/{id}/reject', [RoiCurrentProjectController::class, 'reject'])
                    ->name('roi.current.reject');

                Route::post('/{id}/approve', [RoiCurrentProjectController::class, 'approve'])
                    ->name('roi.current.approve');

                Route::get('/{id}/print', function ($id) {
                    $p = \App\Models\RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

                    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                        'tab' => request('tab', 'summary'),
                        'storageKey' => request('storageKey'),
                        'autoprint' => (bool) request('autoprint', false),
                        'showDraftWatermark' => false,
                        'entryProject' => $p,
                    ]);
                })->name('roi.current.print');
            });

            /*
            |--------------------------------------------------------------------------
            | Archive
            |--------------------------------------------------------------------------
            */
            Route::get('/archive', [RoiController::class, 'archive'])
                ->name('roi.archive');

            Route::get('/archive/{id}', [RoiController::class, 'archiveShow'])
                ->name('roi.archive.show');

            /*
            |--------------------------------------------------------------------------
            | Proposals
            |--------------------------------------------------------------------------
            */
         Route::prefix('proposals')->name('proposals.')->group(function () {
                // This will be URL: /proposals  Name: proposals.index
                Route::get('/', [ProposalController::class, 'proposalList'])->name('index'); 

                // Actions
                Route::get('/{id}', [ProposalController::class, 'show'])->name('show');
                Route::post('/{id}/draft', [ProposalController::class, 'saveDraft'])->name('draft');
                Route::post('/{id}/generate', [ProposalController::class, 'generate'])->name('generate');
            });
        });
    });

require __DIR__ . '/auth.php';