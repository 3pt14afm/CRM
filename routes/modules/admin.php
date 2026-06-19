<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\ApproverMatrixController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\LocationController;
use App\Http\Controllers\Admin\PositionController;
use App\Http\Controllers\Admin\PreferencesController;
use App\Http\Controllers\Admin\PrinterController;
use App\Http\Controllers\Admin\PrinterSupplyController;
use App\Http\Controllers\Admin\SprfApproverMatrixController;
use App\Http\Controllers\Admin\SupplyController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;



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
        Route::post('/users/{id}/signature', [UserController::class, 'updateSignatureForUser'])->name('admin.users.signature');
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



