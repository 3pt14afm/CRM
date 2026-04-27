<?php

namespace App\Services\SPRF;

use App\Models\SPRF\SprfNumberSequence;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class SprfNumberGenerator
{
    public function generateForCreatedAt(CarbonInterface $createdAt): string
    {
        return DB::transaction(function () use ($createdAt) {
            $period = $createdAt->format('Ym');

            DB::table('sprf_number_sequences')->insertOrIgnore([
                'period' => $period,
                'last_number' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $sequence = SprfNumberSequence::query()
                ->where('period', $period)
                ->lockForUpdate()
                ->firstOrFail();

            $sequence->last_number += 1;
            $sequence->save();

            return 'SPRF' . $period . str_pad(
                (string) $sequence->last_number,
                3,
                '0',
                STR_PAD_LEFT
            );
        });
    }
}