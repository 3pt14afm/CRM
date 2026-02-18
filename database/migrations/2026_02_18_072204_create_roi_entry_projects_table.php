<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('roi_entry_projects', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->restrictOnDelete();

            // recommended stable ID across stages (entry/current/archive)
            $table->ulid('project_uid')->unique();

            $table->string('reference')->unique();
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('last_saved_at')->nullable();

            // entry scope
            $table->string('status')->default('draft'); // draft | submitted (optional)

            // inputs: companyInfo
            $table->string('company_name');
            $table->unsignedInteger('contract_years')->default(0);
            $table->string('contract_type');
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

            // computed: succeeding years snapshot (overwrite)
            $table->json('yearly_breakdown')->nullable();

            // notes/comments stored inline (append-only arrays)
            $table->json('notes')->nullable();
            $table->json('comments')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['company_name']);
            $table->index(['contract_type']);
            $table->index(['contract_years']);
            $table->index(['updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roi_entry_projects');
    }
};
