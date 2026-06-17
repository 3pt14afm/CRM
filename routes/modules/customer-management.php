<?php

use App\Http\Controllers\Customer\CustomerInfoController;
use App\Http\Controllers\Customer\CustomerManagementController;
use App\Http\Controllers\Customer\ProposalController;
use App\Http\Controllers\Customer\RoiController;
use App\Http\Controllers\RoiArchiveController;
use App\Http\Controllers\RoiCurrentProjectController;
use App\Http\Controllers\RoiEntryProjectController;
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

        /*

|--------------------------------------------------------------------------
| Customer Info Directory Paths
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])
    ->prefix('customerinfo')
    ->name('customerinfo.')
    ->group(function () {
        Route::get('/companies', [CustomerInfoController::class, 'index'])->name('companies.index');
        Route::get('/companies/{id}', [CustomerInfoController::class, 'show'])->name('companies.show');
    });

    