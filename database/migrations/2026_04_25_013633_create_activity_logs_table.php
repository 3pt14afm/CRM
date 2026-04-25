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
      Schema::create('activity_logs', function (Blueprint $table) {
        $table->id();

        $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
        $table->string('user_name')->nullable();
        $table->string('user_role')->nullable();

        $table->string('module_type')->nullable();
        $table->string('activity_type');

        $table->nullableMorphs('subject');

        $table->json('old_values')->nullable();
        $table->json('new_values')->nullable();

        $table->text('activity_details')->nullable();

        $table->string('ip_address')->nullable();
        $table->text('user_agent')->nullable();
        $table->string('route_name')->nullable();
        $table->string('url')->nullable();
        $table->string('method')->nullable();

        $table->string('status')->default('success');

        $table->timestamps();

        $table->index(['user_id', 'module_type', 'activity_type']);
        $table->index('created_at');
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
