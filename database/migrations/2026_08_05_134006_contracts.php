<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();

            // Not a hard FK constraint on purpose — the companies table name
            // is resolved dynamically elsewhere via (new Company())->getTable(),
            // so we index the column instead of assuming the table name here.
            $table->unsignedBigInteger('company_id');
            $table->index('company_id');

            $table->string('company_name');
            $table->string('doc_num', 100);

            $table->date('start_date');
            $table->date('end_date');

            // Original end_date is never overwritten. Every time a user
            // extends a contract, a new entry is appended here instead:
            // [{ "date": "2027-01-31", "extended_at": "2026-08-04 10:12:00", "extended_by": "EMP-0001" }, ...]
            $table->json('extend_dates')->nullable();

            // Computed server-side (see Contract::computeStatus()) rather
            // than derived in the frontend. One of: active, expiring_soon,
            // expired, extended — plus the two final, explicitly-set
            // states below: terminated, archived.
            $table->string('status', 20)->default('active');
            $table->index('status');

            // Set only when an employee explicitly terminates/cancels a
            // still-live contract (active/extended/expiring_soon). Once
            // set, status is final and never recomputed from dates again.
            $table->timestamp('terminated_at')->nullable();
            $table->string('terminated_by')->nullable(); // employee_id who terminated it

            // Set only when an employee explicitly archives an already
            // expired contract. Once set, status is final and never
            // recomputed from dates again.
            $table->timestamp('archived_at')->nullable();
            $table->string('archived_by')->nullable(); // employee_id who archived it

            $table->string('pdf_path')->nullable();
            $table->string('uploader')->nullable(); // employee_id of the uploader

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};