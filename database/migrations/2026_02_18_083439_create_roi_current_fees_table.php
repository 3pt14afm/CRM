<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('roi_current_fees', function (Blueprint $table) {
            $table->id();

            $table->foreignId('roi_current_project_id')
                ->constrained('roi_current_projects')
                ->cascadeOnDelete();

            $table->string('client_row_id')->nullable();
            $table->string('payer'); // company | customer

            $table->string('label');
            $table->string('category')->nullable();
            $table->text('remarks')->nullable();

            $table->decimal('cost', 18, 6)->default(0);
            $table->decimal('qty', 12, 4)->default(0);
            $table->decimal('total', 18, 6)->default(0);

            $table->boolean('is_machine')->default(false);

            $table->timestamps();

            $table->index(['roi_current_project_id', 'payer']);
            $table->index(['category']);
            $table->index(['label']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roi_current_fees');
    }
};
