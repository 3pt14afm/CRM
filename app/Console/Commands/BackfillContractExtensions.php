<?php

namespace App\Console\Commands;

use App\Models\Contracts\Contract;
use Illuminate\Console\Command;

class BackfillContractExtensions extends Command
{
    protected $signature = 'contracts:backfill-extensions';
    protected $description = 'Copy legacy contracts.extend_dates JSON entries into contract_extensions.';

    public function handle(): int
    {
        Contract::query()
            ->whereNotNull('extend_dates')
            ->whereDoesntHave('extensions') // safe to re-run, won't duplicate
            ->chunkById(100, function ($contracts) {
                foreach ($contracts as $contract) {
                    foreach (collect($contract->extend_dates ?? [])->sortBy('date') as $entry) {
                        if (empty($entry['date'])) continue;

                        $contract->extensions()->create([
                            'date'        => $entry['date'],
                            'extended_at' => $entry['extended_at'] ?? $contract->updated_at,
                            'extended_by' => $entry['extended_by'] ?? null,
                            'pdf_path'    => null, // none existed for legacy entries
                        ]);
                    }
                }
            });

        $this->info('Backfill complete.');
        return self::SUCCESS;
    }
}