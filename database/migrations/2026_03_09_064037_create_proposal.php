<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('proposals', function (Blueprint $table) {
            $table->id();

            $table->foreignId('roi_archive_project_id')
                ->constrained('roi_archive_projects')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // Status: draft | generated
            $table->enum('status', ['draft', 'generated'])->default('draft');

            // Header / client info
            $table->string('company_name')->nullable();
            $table->string('attention')->nullable();       // contact person
            $table->string('designation')->nullable();
            $table->string('email')->nullable();
            $table->string('mobile')->nullable();

            // Salutation / message
            $table->text('message')->nullable();

            // Machine showcase
            // specs: [{ label, value }]
            $table->json('specs')->nullable();

            // Printer image stored as base64 or file path
            $table->longText('printer_image')->nullable();

            // Unit price (editable override shown in price badge)
            $table->decimal('unit_price', 18, 6)->default(0);

            // Terms & conditions (plain text with inline <b>/<i> tags)
            $table->text('terms_text')->nullable();

            // Closing paragraph
            $table->text('closing_text')->nullable();

            // Signatures stored as base64 or file path
            $table->longText('user_signature')->nullable();

            // Conforme
            $table->string('conforme_name')->nullable();
            $table->longText('conforme_signature')->nullable();

            $table->timestamps();

            $table->index(['roi_archive_project_id', 'status']);
            $table->index(['user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposals');
    }
};