<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\ApproverMatrixController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\LocationController;
use App\Http\Controllers\Admin\PositionController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\PreferencesController;
use App\Http\Controllers\Admin\PrinterController;
use App\Http\Controllers\Admin\SupplyController;
use App\Http\Controllers\Admin\PrinterSupplyController;
use App\Http\Controllers\Admin\SprfApproverMatrixController;
use App\Http\Controllers\Customer\CustomerManagementController;
use App\Http\Controllers\Customer\ProposalController;
use App\Http\Controllers\RoiArchiveController;
use App\Http\Controllers\Customer\RoiController;
use App\Http\Controllers\CustomerInfoController;
use App\Http\Controllers\ForcePasswordChangeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoiChatController;
use App\Http\Controllers\RoiCurrentProjectController;
use App\Http\Controllers\RoiEntryProjectController;
use App\Http\Controllers\SPRF\SprfController;
use App\Http\Controllers\SPRF\SprfCurrentProjectController;
use App\Http\Controllers\SPRF\SprfEntryProjectController;
use App\Models\CustomerInfo\Company;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('customers.dashboard')
        : redirect()->route('login');
});

Route::middleware('auth')->group(function () {
    Route::post('/force-password-change', [ForcePasswordChangeController::class, 'store'])->name('force-password.change');
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
        Route::get('/printer-master', [PrinterController::class, 'printerMaster'])->name('printer-master.index');
        Route::get('/supply-master', [SupplyController::class, 'supplyMaster'])->name('supply-master.index');
        Route::get('/printer-supplies', [PrinterSupplyController::class, 'printerSupplies'])->name('printer-supplies.index');
        Route::get('/user-management', [UserController::class, 'userManagement'])->name('user-management.index');
        Route::get('/user-management/suggestions', [UserController::class, 'userManagementSuggestions'])->name('user-management.suggestions');
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
        Route::post('/users/{user}/reset-password', [UserController::class, 'userResetPassword'])->name('users.reset-password');

        // Approver Matrix CRUD
        Route::post('/approver-matrix', [ApproverMatrixController::class, 'store'])->name('approver-matrix.store');
        Route::put('/approver-matrix/{locationDepartment}', [ApproverMatrixController::class, 'update'])->name('approver-matrix.update');

        // Printer Models CRUD
        Route::get('/printer-models', [PrinterController::class, 'printerModelIndex'])->name('printer-models.index');
        Route::post('/printer-models', [PrinterController::class, 'printerModelStore'])->name('printer-models.store');
        Route::put('/printer-models/{printerModel}', [PrinterController::class, 'printerModelUpdate'])->name('printer-models.update');
        Route::patch('/printer-models/{printerModel}/activate', [PrinterController::class, 'printerModelActivate'])->name('printer-models.activate');
        Route::patch('/printer-models/{printerModel}/deactivate', [PrinterController::class, 'printerModelDeactivate'])->name('printer-models.deactivate');

        // Supplies CRUD
        Route::get('/supplies', [SupplyController::class, 'supplyIndex'])->name('supplies.index');
        Route::post('/supplies', [SupplyController::class, 'supplyStore'])->name('supplies.store');
        Route::put('/supplies/{supply}', [SupplyController::class, 'supplyUpdate'])->name('supplies.update');
        Route::patch('/supplies/{supply}/activate', [SupplyController::class, 'supplyActivate'])->name('supplies.activate');
        Route::patch('/supplies/{supply}/deactivate', [SupplyController::class, 'supplyDeactivate'])->name('supplies.deactivate');

        // Printer Supplies CRUD
        Route::get('/printer-models/{printerModel}/supplies', [PrinterSupplyController::class, 'printerModelSupplyIndex'])->name('printer-models.supplies.index');
        Route::get('/supplies/{supply}/printer-models', [PrinterSupplyController::class, 'supplyPrinterModelIndex'])->name('supplies.printer-models.index');
        Route::post('/printer-model-supplies', [PrinterSupplyController::class, 'printerModelSupplyStore'])->name('printer-model-supplies.store');
        Route::put('/printer-model-supplies/{printerModelSupply}', [PrinterSupplyController::class, 'printerModelSupplyUpdate'])->name('printer-model-supplies.update');
        Route::patch('/printer-model-supplies/{printerModelSupply}/activate', [PrinterSupplyController::class, 'printerModelSupplyActivate'])->name('printer-model-supplies.activate');
        Route::patch('/printer-model-supplies/{printerModelSupply}/deactivate', [PrinterSupplyController::class, 'printerModelSupplyDeactivate'])->name('printer-model-supplies.deactivate');
        Route::delete('/printer-model-supplies/{printerModelSupply}', [PrinterSupplyController::class, 'printerModelSupplyDestroy'])->name('printer-model-supplies.destroy');

        Route::post('/printer-supplies/managed-printers', [PrinterSupplyController::class, 'addManagedPrinter'])->name('printer-supplies.managed-printers.store');
        Route::delete('/printer-supplies/managed-printers/{printerSupplyPagePrinter}', [PrinterSupplyController::class, 'removeManagedPrinter'])->name('printer-supplies.managed-printers.destroy');
        Route::post('/printer-supplies/managed-supplies', [PrinterSupplyController::class, 'addManagedSupply'])->name('printer-supplies.managed-supplies.store');
        Route::delete('/printer-supplies/managed-supplies/{printerSupplyPageSupply}', [PrinterSupplyController::class, 'removeManagedSupply'])->name('printer-supplies.managed-supplies.destroy');

        // Preferences CRUD
        Route::get('/preferences', [PreferencesController::class, 'preferenceMaster'])->name('preferences.index');
        Route::post('/preferences', [PreferencesController::class, 'preferenceStore'])->name('preferences.store');
        Route::put('/preferences/{preference}', [PreferencesController::class, 'preferenceUpdate'])->name('preferences.update');
        Route::patch('/preferences/{preference}/activate', [PreferencesController::class, 'preferenceActivate'])->name('preferences.activate');
        Route::patch('/preferences/{preference}/deactivate', [PreferencesController::class, 'preferenceDeactivate'])->name('preferences.deactivate');

        // Company Directory endpoints
        Route::get('/directory/departments', [DepartmentController::class, 'departments'])->name('directory.departments');
        Route::get('/directory/positions', [PositionController::class, 'positions'])->name('directory.positions');
        Route::get('/directory/employees', [UserController::class, 'employeesByPosition'])->name('directory.employees');
        Route::post('/users/assign-employee', [UserController::class, 'assignEmployeeUser'])->name('users.assign-employee');

        //SPRF Approval Matrix CRUD
        Route::post('/sprf-approver-matrix', [SprfApproverMatrixController::class, 'store'])->name('sprf-approver-matrix.store');
        Route::put('/sprf-approver-matrix/{matrix}', [SprfApproverMatrixController::class, 'update'])->name('sprf-approver-matrix.update');
        Route::patch('/sprf-approver-matrix/{matrix}/activate', [SprfApproverMatrixController::class, 'activate'])->name('sprf-approver-matrix.activate');
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
        Route::prefix('customerinfo') // Adds 'customerinfo/' to the URL (e.g., /customerinfo/companies)
            ->name('customerinfo.')   // Prepends 'customerinfo.' to the route names
            ->group(function () {
                
                Route::get('/companies', [CustomerInfoController::class, 'index'])->name('companies.index');
                Route::get('/companies/{id}', [CustomerInfoController::class, 'show'])->name('companies.show');
                
            });

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

                Route::get('/companies/search', [RoiEntryProjectController::class, 'getCompanySuggestions'])->name('companies.search');

                Route::get('/projects/{project}/print', function ($project) {
                    $p = \App\Models\RoiEntryProject::with(['items', 'fees', 'user'])->findOrFail($project);

                    $userIds = collect([
                        $p->user_id,
                        $p->status_updated_by,
                        $p->reviewed_by,
                        $p->checked_by,
                        $p->endorsed_by,
                        $p->confirmed_by,
                        $p->approved_by,
                        $p->rejected_by,
                    ])->filter()->unique()->values();

                    $usersById = \App\Models\User::query()
                        ->whereIn('id', $userIds)
                        ->get(['id', 'first_name', 'last_name', 'position'])
                        ->keyBy(fn ($u) => (string) $u->id)
                        ->map(fn ($u) => [
                            'id' => $u->id,
                            'name' => trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')),
                            'position' => $u->position ?? '—', // ← add position
                        ]);

                    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                        'tab' => request('tab', 'summary'),
                        'storageKey' => request('storageKey'),
                        'autoprint' => (bool) request('autoprint', false),
                        'showDraftWatermark' => (bool) request('draftWatermark', true),
                        'entryProject' => $p,
                        'usersById' => $usersById,
                        'route' => 'entry',
                    ]);
                })->name('roi.entry.projects.print');

                Route::get('/projects/{project}/attachments/{attachmentIndex}/{filename?}', [RoiEntryProjectController::class, 'showAttachment'])
                    ->name('roi.entry.projects.attachments.show');
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

                Route::post('/{project}/notes', [RoiCurrentProjectController::class, 'storeNote'])
                    ->name('roi.current.notes.store');

                Route::post('/{project}/comments', [RoiEntryProjectController::class, 'storeComment'])
                    ->name('roi.projects.comments.store');

                Route::post('/{id}/advance', [RoiCurrentProjectController::class, 'advanceProject'])
                    ->name('roi.current.advance');

                Route::post('/{id}/reject', [RoiCurrentProjectController::class, 'reject'])
                    ->name('roi.current.reject');

                Route::post('/{id}/approve', [RoiCurrentProjectController::class, 'approve'])
                    ->name('roi.current.approve');

                Route::get('/{id}/print', function ($id) {
                    $p = \App\Models\RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

                    $userIds = collect([
                        $p->user_id,
                        $p->status_updated_by,
                        $p->reviewed_by,
                        $p->checked_by,
                        $p->endorsed_by,
                        $p->confirmed_by,
                        $p->approved_by,
                    ])->filter()->unique()->values();

                    $usersById = \App\Models\User::query()
                        ->whereIn('id', $userIds)
                        ->get(['id', 'first_name', 'last_name', 'position'])
                        ->keyBy(fn ($u) => (string) $u->id)
                        ->map(fn ($u) => [
                            'id' => $u->id,
                            'name' => trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')),
                            'position' => $u->position ?? '—', // ← add position
                        ]);

                    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                        'tab' => request('tab', 'summary'),
                        'storageKey' => request('storageKey'),
                        'autoprint' => (bool) request('autoprint', false),
                        'showDraftWatermark' => false,
                        'entryProject' => $p,
                        'usersById' => $usersById,
                        'route' => 'current',
                    ]);
                })->name('roi.current.print');
            
                // Route::get('/{id}/attachments/{attachmentId}', [RoiCurrentProjectController::class, 'showAttachment'])
                //     ->name('roi.current.attachments.show');

                Route::get('/{id}/attachments/{attachmentIndex}/{filename?}', [RoiCurrentProjectController::class, 'showAttachment'])
                    ->name('roi.current.attachments.show');
            });

            /*
            |--------------------------------------------------------------------------
            | Archive
            |--------------------------------------------------------------------------
            */
            Route::get('/archive', [RoiArchiveController::class, 'index'])
                ->name('roi.archive');

            Route::get('/archive/{id}', [RoiArchiveController::class, 'show'])
                ->name('roi.archive.show');

           // routes/web.php — archive print route
            Route::get('/archive/{id}/print', function ($id) {
                $p = \App\Models\RoiArchiveProject::with(['items', 'fees', 'user'])->findOrFail($id);

                $userIds = collect([
                    $p->user_id,
                    $p->status_updated_by,
                    $p->reviewed_by,
                    $p->checked_by,
                    $p->endorsed_by,
                    $p->confirmed_by,
                    $p->approved_by,
                    $p->rejected_by,
                ])->filter()->unique()->values();

                $usersById = \App\Models\User::query()
                    ->whereIn('id', $userIds)
                    ->get(['id', 'first_name', 'last_name', 'position']) // ← add position
                    ->keyBy(fn ($u) => (string) $u->id)
                    ->map(fn ($u) => [
                        'id' => $u->id,
                        'name' => trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')),
                        'position' => $u->position ?? '—', // ← add position
                    ]);

                return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
                    'tab' => request('tab', 'summary'),
                    'storageKey' => request('storageKey'),
                    'autoprint' => (bool) request('autoprint', false),
                    'showDraftWatermark' => false,
                    'entryProject' => $p,
                    'usersById' => $usersById,
                    'route' => 'archive',
                ]);
            })->name('roi.archive.print');

            // Route::get('/archive/{id}/attachments/{attachmentId}', [RoiController::class, 'showArchiveAttachment'])
            //     ->name('roi.archive.attachments.show');
            
            Route::get('/archive/{id}/attachments/{attachmentIndex}/{filename?}', [RoiArchiveController::class, 'showArchiveAttachment'])
               ->name('roi.archive.attachments.show');

            /*
            |--------------------------------------------------------------------------
            | Proposals
            |--------------------------------------------------------------------------
            */
            Route::prefix('proposals')->name('proposals.')->group(function () {
                Route::get('/', [ProposalController::class, 'proposalList'])->name('index');
                Route::get('/{id}', [ProposalController::class, 'show'])->name('show');
                Route::get('/{id}/print', [ProposalController::class, 'print'])->name('print');
                Route::post('/{id}/draft', [ProposalController::class, 'saveDraft'])->name('draft');
                Route::post('/{id}/generate', [ProposalController::class, 'generate'])->name('generate');
            });
        });

        // Route::post('/roi/chat/message', [RoiChatController::class, 'message'])
        //     ->name('roi.chat.message');

        // Route::post('/roi/chat/reset', [RoiChatController::class, 'reset'])
        //     ->name('roi.chat.reset');

        Route::prefix('sprf')->group(function () {
            Route::get('/current', [SprfCurrentProjectController::class, 'current'])
                ->name('sprf.current');

            Route::get('/current/{project}', [SprfCurrentProjectController::class, 'show'])
                ->name('sprf.current.show');

            Route::get('/current/{project}/print', [SprfCurrentProjectController::class, 'print'])
                ->name('sprf.current.print');

            Route::post('/current/{project}/advance', [SprfCurrentProjectController::class, 'advanceProject'])
                ->name('sprf.current.advance');

            Route::post('/current/{project}/reject', [SprfCurrentProjectController::class, 'reject'])
                ->name('sprf.current.reject');

            Route::post('/current/{project}/approve', [SprfCurrentProjectController::class, 'approve'])
                ->name('sprf.current.approve');

            Route::get('/archive', [SprfController::class, 'archive'])
                ->name('sprf.archive');

            Route::get('/archive/{project}', [SprfController::class, 'archiveShow'])
                ->name('sprf.archive.show');

            Route::get('/archive/{project}/print', [SprfController::class, 'archivePrint'])
                ->name('sprf.archive.print');

            Route::prefix('entry')->group(function () {
                Route::get('/', [SprfController::class, 'entryList'])
                    ->name('sprf.entry.list');

                Route::get('/create', [SprfController::class, 'entryCreate'])
                    ->name('sprf.entry.create');

                Route::post('/draft', [SprfEntryProjectController::class, 'saveDraft'])
                    ->name('sprf.entry.draft.save');

                Route::get('/projects/{project}', [SprfEntryProjectController::class, 'show'])
                    ->name('sprf.entry.projects.show');

                Route::get('/projects/{project}/print', [SprfEntryProjectController::class, 'print'])
                    ->name('sprf.entry.projects.print');

                Route::patch('/projects/{project}/submit', [SprfEntryProjectController::class, 'submit'])
                    ->name('sprf.entry.projects.submit');

                Route::delete('/projects/{project}', [SprfEntryProjectController::class, 'destroy'])
                    ->name('sprf.entry.projects.destroy');
            });
        });

    });

require __DIR__ . '/auth.php';