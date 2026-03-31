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
       Schema::create('roi_chat_messages', function (Blueprint $table) {
        $table->id();

        $table->foreignId('session_id')
            ->constrained('roi_chat_sessions')
            ->cascadeOnDelete();

        $table->enum('role', ['user', 'assistant']);
        $table->text('content');

        $table->timestamps();
       });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roi_chat_messages');
    }
};
