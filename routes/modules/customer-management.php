<?php

use App\Http\Controllers\Customer\CustomerInfoController;
use App\Http\Controllers\Customer\CustomerManagementController;
use App\Http\Controllers\Customer\ProposalController;
use App\Http\Controllers\Customer\RoiController;
use App\Http\Controllers\CustomerInfo\PotentialCustomerController;
use App\Http\Controllers\Roi\RoiPrintController;
use App\Http\Controllers\Roi\RoiArchiveController;
use App\Http\Controllers\Roi\RoiCurrentProjectController;
use App\Http\Controllers\Roi\RoiEntryProjectController;
use App\Http\Controllers\SPRF\SprfController;
use App\Http\Controllers\SPRF\SprfCurrentProjectController;
use App\Http\Controllers\SPRF\SprfEntryProjectController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


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

            // ROI ENTRY ROUTES
            Route::prefix('entry')->group(function () {
                Route::get('/', [RoiController::class, 'entryList'])->name('roi.entry.list');
                Route::get('/create', [RoiController::class, 'entryCreate'])->name('roi.entry.create');
                Route::post('/draft', [RoiEntryProjectController::class, 'saveDraft'])->name('roi.entry.draft.save');
                Route::get('/projects/{project}', [RoiEntryProjectController::class, 'show'])->name('roi.entry.projects.show');
                Route::patch('/projects/{project}/submit', [RoiEntryProjectController::class, 'submit'])->name('roi.entry.projects.submit');
                Route::delete('/projects/{project}', [RoiEntryProjectController::class, 'destroy'])->name('roi.entry.projects.destroy');
                Route::post('/projects/{project}/notes', [RoiEntryProjectController::class, 'storeNote'])->name('roi.entry.projects.notes.store');
                Route::get('/roi/companies/search', [RoiEntryProjectController::class, 'getCompanySuggestions'])
                    ->name('companies.search');

                Route::get('/roi/potentials/search', [RoiEntryProjectController::class, 'getPotentialSuggestions'])
                    ->name('potentials.search');                Route::get('/entry/projects/{project}/print', [RoiPrintController::class, 'printEntry'])->name('roi.entry.projects.print');
                Route::get('/projects/{project}/attachments/{attachmentIndex}/{filename?}', [RoiEntryProjectController::class, 'showAttachment'])->name('roi.entry.projects.attachments.show');
            });

            /*
            ROI CURRENT ROUTES
             These actions are temporary runtime workflow actions.
             Later, Approver Matrix + resolved approvers will drive them.
            */
            Route::prefix('current')->group(function () {
                Route::get('/', [RoiCurrentProjectController::class, 'current'])->name('roi.current');
                Route::get('/{id}', [RoiCurrentProjectController::class, 'show'])->name('roi.current.show');
                Route::patch('/{id}/send-back', [RoiCurrentProjectController::class, 'sendBack'])->name('roi.current.send-back');
                Route::post('/{project}/notes', [RoiCurrentProjectController::class, 'storeNote'])->name('roi.current.notes.store');
                Route::post('/{project}/comments', [RoiEntryProjectController::class, 'storeComment'])->name('roi.projects.comments.store');

                Route::post('/{id}/advance', [RoiCurrentProjectController::class, 'advanceProject'])->name('roi.current.advance');
                Route::post('/{id}/reject', [RoiCurrentProjectController::class, 'reject'])->name('roi.current.reject');
                Route::post('/{id}/approve', [RoiCurrentProjectController::class, 'approve'])->name('roi.current.approve');
                Route::get('/current/{id}/print', [RoiPrintController::class, 'printCurrent'])->name('roi.current.print');
              
                // Route::get('/{id}/attachments/{attachmentId}', [RoiCurrentProjectController::class, 'showAttachment'])->name('roi.current.attachments.show');

                Route::get('/{id}/attachments/{attachmentIndex}/{filename?}', [RoiCurrentProjectController::class, 'showAttachment'])
                    ->name('roi.current.attachments.show');

                 Route::patch('/{id}/withdraw', [RoiCurrentProjectController::class, 'withdraw'])
                    ->name('roi.current.withdraw');

                Route::patch('/{id}/cancel', [RoiCurrentProjectController::class, 'cancel'])
                    ->name('roi.current.cancel');
            });

            //ROI ARCHIVE ROUTES
            Route::get('/archive', [RoiArchiveController::class, 'index'])->name('roi.archive');
            Route::get('/archive/{id}', [RoiArchiveController::class, 'show'])->name('roi.archive.show');

           // routes/web.php — archive print route
            Route::get('/archive/{id}/print', [RoiPrintController::class, 'printArchive'])->name('roi.archive.print');

            // Route::get('/archive/{id}/attachments/{attachmentId}', [RoiController::class, 'showArchiveAttachment'])->name('roi.archive.attachments.show');
            
            Route::get('/archive/{id}/attachments/{attachmentIndex}/{filename?}', [RoiArchiveController::class, 'showArchiveAttachment'])->name('roi.archive.attachments.show');

            //PROPOSAL ROUTES
            Route::prefix('proposals')->name('proposals.')->group(function () {
                Route::get('/', [ProposalController::class, 'proposalList'])->name('index');
                Route::get('/{id}', [ProposalController::class, 'show'])->name('show');
                Route::get('/{id}/print', [ProposalController::class, 'print'])->name('print');
                Route::post('/{id}/draft', [ProposalController::class, 'saveDraft'])->name('draft');
                Route::post('/{id}/generate', [ProposalController::class, 'generate'])->name('generate');
            });
        });

        // Route::post('/roi/chat/message', [RoiChatController::class, 'message'])->name('roi.chat.message');
        // Route::post('/roi/chat/reset', [RoiChatController::class, 'reset'])->name('roi.chat.reset');

        Route::prefix('sprf')->group(function () {

            // --- SPRF Current Projects ---
            Route::get('/current', [SprfCurrentProjectController::class, 'current']) ->name('sprf.current');
            Route::get('/current/{project}', [SprfCurrentProjectController::class, 'show'])->name('sprf.current.show');
            Route::get('/current/{project}/print', [SprfCurrentProjectController::class, 'print'])->name('sprf.current.print');
            Route::post('/current/{project}/advance', [SprfCurrentProjectController::class, 'advanceProject'])->name('sprf.current.advance');
            Route::post('/current/{project}/reject', [SprfCurrentProjectController::class, 'reject'])->name('sprf.current.reject');
            Route::post('/current/{project}/approve', [SprfCurrentProjectController::class, 'approve'])->name('sprf.current.approve');

            // Send Back + Notes/Comments (new)
            Route::post('/current/{project}/send-back', [SprfCurrentProjectController::class, 'sendBack'])->name('sprf.current.send-back');
            Route::post('/current/{project}/notes', [SprfCurrentProjectController::class, 'storeNote'])->name('sprf.current.notes.store');
            Route::post('/current/{project}/comments', [SprfCurrentProjectController::class, 'storeComment'])->name('sprf.current.comments.store');

            // --- SPRF Archive ---
            Route::get('/archive', [SprfController::class, 'archive'])->name('sprf.archive');
            Route::get('/archive/{project}', [SprfController::class, 'archiveShow'])->name('sprf.archive.show');
            Route::get('/archive/{project}/print', [SprfController::class, 'archivePrint'])->name('sprf.archive.print');

            // --- SPRF Entry/Drafts ---
            Route::prefix('entry')->group(function () {
                Route::get('/', [SprfController::class, 'entryList'])->name('sprf.entry.list');
                Route::get('/create', [SprfController::class, 'entryCreate'])->name('sprf.entry.create');
                Route::post('/draft', [SprfEntryProjectController::class, 'saveDraft'])->name('sprf.entry.draft.save');
                Route::get('/projects/{project}', [SprfEntryProjectController::class, 'show'])->name('sprf.entry.projects.show');
                Route::get('/projects/{project}/print', [SprfEntryProjectController::class, 'print'])->name('sprf.entry.projects.print');
                Route::patch('/projects/{project}/submit', [SprfEntryProjectController::class, 'submit'])->name('sprf.entry.projects.submit');
                Route::delete('/projects/{project}', [SprfEntryProjectController::class, 'destroy'])->name('sprf.entry.projects.destroy');
                Route::post('/projects/{project}/notes', [SprfEntryProjectController::class, 'storeNote'])->name('sprf.entry.projects.notes.store');
            });
        });

    });

    
    // CUSTOMER INFO ROUTES
    Route::middleware(['auth', 'verified'])
        ->prefix('customerinfo')
        ->name('customerinfo.')
        ->group(function () {
            Route::get('/companies', [CustomerInfoController::class, 'index'])->name('companies.index');
            Route::get('/companies/{id}', [CustomerInfoController::class, 'show'])->name('companies.show');
            Route::get('/customer-info/potentials', [PotentialCustomerController::class, 'index'])->name('customerinfo.potentials.index');
        });

    