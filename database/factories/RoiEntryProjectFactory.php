<?php

namespace Database\Factories;

use App\Models\RoiEntryProject;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class RoiEntryProjectFactory extends Factory
{
    protected $model = RoiEntryProject::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'location_id' => null,

            'project_uid' => (string) Str::ulid(),
            'reference' => 'ROI-' . $this->faker->unique()->numerify('######'),
            'version' => 1,

            'status' => 'draft',

            'company_name' => $this->faker->company(),
            'company_sap_code' => null,
            'company_id' => null,
            'contract_years' => 1,
            'contract_type' => 'New',
            'purpose' => null,
            'bundled_std_ink' => false,

            'annual_interest' => 0,
            'percent_margin' => 0,

            'mono_yield_monthly' => 0,
            'mono_yield_annual' => 0,
            'color_yield_monthly' => 0,
            'color_yield_annual' => 0,

            'mc_unit_cost' => 0,
            'mc_qty' => 0,
            'mc_total_cost' => 0,
            'mc_yields' => 0,
            'mc_cost_cpp' => 0,
            'mc_selling_price' => 0,
            'mc_total_sell' => 0,
            'mc_sell_cpp' => 0,
            'mc_total_bundled_price' => 0,

            'fees_total' => 0,

            'grand_total_cost' => 0,
            'grand_total_revenue' => 0,
            'grand_roi' => 0,
            'grand_roi_percentage' => 0,

            'yearly_breakdown' => null,
            'notes' => null,
            'comments' => null,

            'entry_remarks' => null,
            'entry_remarks_attachments' => null,
        ];
    }
}