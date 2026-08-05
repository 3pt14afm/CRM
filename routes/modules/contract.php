<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Contract\ContractController;

Route::middleware(['auth', 'verified'])
    ->prefix('contract')
    ->name('contract.')
    ->group(function () {
        Route::get('/upload', [ContractController::class, 'upload'])->name('upload');
        Route::post('/store/{company}', [ContractController::class, 'store'])->name('store');
        Route::post('/contracts/{contractId}/update', [ContractController::class, 'update'])->name('update');
        Route::post('/{contract}/extend', [ContractController::class, 'extendDate'])->name('extend');
        Route::get('/{company}/contracts', [ContractController::class, 'contracts'])->name('contracts');
        Route::get('/pdf/{contract}', [ContractController::class, 'viewPdf'])->name('pdf');
        Route::get('/create/{company?}', [ContractController::class, 'create'])->name('create');
        Route::get('/renewal', [ContractController::class, 'renewal'])->name('renewal');
        Route::get('/review', [ContractController::class, 'review'])->name('review');
    });