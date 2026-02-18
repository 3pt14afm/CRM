<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('roi_current_projects', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->restrictOnDelete();

            // stable ID across stages
            $table->ulid('project_uid')->unique();

            $table->string('reference')->unique();
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('last_saved_at')->nullable();

            // current scope
            $table->string('status')->default('pending'); // pending | rejected | back_to_sender
            $table->text('status_reason')->nullable();
            $table->timestamp('status_updated_at')->nullable();
            $table->unsignedBigInteger('status_updated_by')->nullable();

            // inputs: companyInfo
            $table->string('company_name')->default('');
            $table->unsignedInteger('contract_years')->default(0);
            $table->string('contract_type')->default('');
            $table->boolean('bundled_std_ink')->default(false);

            // inputs: interest
            $table->decimal('annual_interest', 10, 4)->default(0);
            $table->decimal('percent_margin', 10, 4)->default(0);

            // inputs: yield
            $table->unsignedInteger('mono_yield_monthly')->default(0);
            $table->unsignedInteger('mono_yield_annual')->default(0);
            $table->unsignedInteger('color_yield_monthly')->default(0);
            $table->unsignedInteger('color_yield_annual')->default(0);

            // computed: machineConfiguration.totals
            $table->decimal('mc_unit_cost', 18, 6)->default(0);
            $table->decimal('mc_qty', 18, 4)->default(0);
            $table->decimal('mc_total_cost', 18, 6)->default(0);
            $table->decimal('mc_yields', 18, 4)->default(0);
            $table->decimal('mc_cost_cpp', 18, 10)->default(0);
            $table->decimal('mc_selling_price', 18, 6)->default(0);
            $table->decimal('mc_total_sell', 18, 6)->default(0);
            $table->decimal('mc_sell_cpp', 18, 10)->default(0);
            $table->decimal('mc_total_bundled_price', 18, 6)->default(0);

            // computed: fees total
            $table->decimal('fees_total', 18, 6)->default(0);

            // computed: grand totals
            $table->decimal('grand_total_cost', 18, 6)->default(0);
            $table->decimal('grand_total_revenue', 18, 6)->default(0);
            $table->decimal('grand_roi', 18, 6)->default(0);
            $table->decimal('grand_roi_percentage', 18, 10)->default(0);

            // computed: succeeding years snapshot
            $table->json('yearly_breakdown')->nullable();

            // inline notes/comments if you still want them later
            $table->json('notes')->nullable();
            $table->json('comments')->nullable();

            $table->timestamp('submitted_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['contract_type']);
            $table->index(['contract_years']);
            $table->index(['updated_at']);

            $table->foreign('status_updated_by')
                ->references('id')->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roi_current_projects');
    }
};
