<?php

namespace App\Services;

use App\Models\RoiChatSession;

class RoiChatService
{
    public function __construct(
        protected RoiValueExtractionService $valueExtractionService,
        protected RoiDraftCreationService $draftCreationService,
        protected RoiPrinterResolverService $printerResolver
    ) {
    }

    public function handle(RoiChatSession $session, string $message): array
    {
        $message = trim($message);
        $state = $session->state ?? [];
        $stage = $session->stage ?? 'collecting';
        $normalized = strtolower($message);

        if ($message === '') {
            return [
                'reply' => 'Send the ROI details all at once or one by one, and I’ll help you build the draft.',
                'stage' => $stage,
                'state' => $state,
            ];
        }

        if ($stage === 'completed') {
            if (in_array($normalized, ['new', 'new draft', 'start over', 'reset'], true)) {
                $state = [];
                $session->stage = 'collecting';
                $session->state = $state;
                $session->save();

                return [
                    'reply' => 'Okay, let’s start a new ROI draft. You can send the details all at once or one by one.',
                    'stage' => 'collecting',
                    'state' => $state,
                ];
            }

            return [
                'reply' => 'This draft has already been created. Type "new draft" if you want to start another one.',
                'stage' => 'completed',
                'state' => $state,
            ];
        }

        // Let the extractor interpret the user message in any stage,
        // including confirming, so edits feel natural.
        $originalState = $state;
        $state = $this->valueExtractionService->extract($state, $message);

        // Try to resolve printer anytime the user mentions one,
        // not only when printer is the next missing field.
        $printerSelectionResult = $this->handlePrinterSelectionAnytime($session, $state, $message);

        if ($printerSelectionResult !== null) {
            return $printerSelectionResult;
        }

        // If user is in confirming stage and changed something,
        // re-evaluate instead of forcing yes/no only.
        if ($stage === 'confirming' && $this->stateChanged($originalState, $state)) {
            $session->stage = 'collecting';
            $session->state = $state;
            $session->save();

            $missing = $this->getMissingFields($state);

            if (!empty($missing)) {
                return [
                    'reply' => $this->buildUpdatedReply($state, $missing),
                    'stage' => 'collecting',
                    'state' => $state,
                ];
            }

            $session->stage = 'confirming';
            $session->state = $state;
            $session->save();

            return [
                'reply' => $this->buildSummary($state) . "\n\nI updated the draft details. Do you want me to create it now?",
                'stage' => 'confirming',
                'state' => $state,
            ];
        }

        // If user is still confirming and did not change any structured data,
        // treat the message as a confirmation reply.
        if ($stage === 'confirming') {
            return $this->handleConfirmation($session, $message, $state);
        }

        $session->state = $state;
        $session->save();

        $missing = $this->getMissingFields($state);

        if (!empty($missing)) {
            $session->stage = 'collecting';
            $session->state = $state;
            $session->save();

            return [
                'reply' => $this->buildSmartReply($state, $missing),
                'stage' => 'collecting',
                'state' => $state,
            ];
        }

        $session->stage = 'confirming';
        $session->state = $state;
        $session->save();

        return [
            'reply' => $this->buildSummary($state) . "\n\nEverything looks good. Do you want me to create the draft now?",
            'stage' => 'confirming',
            'state' => $state,
        ];
    }

    protected function handleConfirmation(RoiChatSession $session, string $message, array $state): array
    {
        $normalized = strtolower(trim($message));

        if (in_array($normalized, ['yes', 'y', 'confirm', 'create', 'create draft'], true)) {
            if (empty($state['printer_model_id'])) {
                $session->stage = 'collecting';
                $session->state = $state;
                $session->save();

                return [
                    'reply' => 'I still need the exact printer model from the database before I can create the draft.',
                    'stage' => 'collecting',
                    'state' => $state,
                ];
            }

            $missing = $this->getMissingFields($state);

            if (!empty($missing)) {
                $session->stage = 'collecting';
                $session->state = $state;
                $session->save();

                return [
                    'reply' => $this->buildSmartReply($state, $missing),
                    'stage' => 'collecting',
                    'state' => $state,
                ];
            }

            $result = $this->draftCreationService->createFromChatState($state);

            if (!$result['success']) {
                $session->stage = 'collecting';
                $session->state = $state;
                $session->save();

                return [
                    'reply' => $result['message'] ?? 'I could not create the draft yet.',
                    'stage' => 'collecting',
                    'state' => $state,
                    'confirmed' => false,
                ];
            }

            $draft = $result['draft'];

            $session->stage = 'completed';
            $session->state = $state;
            $session->save();

            return [
                'reply' => 'Draft created successfully.',
                'stage' => 'completed',
                'state' => $state,
                'confirmed' => true,
                'redirect' => route('roi.entry.projects.show', $draft),
            ];
        }

        if (in_array($normalized, ['no', 'n', 'cancel', 'not yet'], true)) {
            $session->stage = 'collecting';
            $session->state = $state;
            $session->save();

            return [
                'reply' => 'No problem — tell me what you want to change, and I’ll update the draft details.',
                'stage' => 'collecting',
                'state' => $state,
                'confirmed' => false,
            ];
        }

        return [
            'reply' => 'You can say "yes" to create the draft, or just tell me what you want to change.',
            'stage' => 'confirming',
            'state' => $state,
        ];
    }

    protected function handlePrinterSelectionAnytime(RoiChatSession $session, array &$state, string $message): ?array
    {
        $trimmedMessage = trim($message);

        // If a numeric printer ID is entered directly, try resolving it.
        if (preg_match('/^\d+$/', $trimmedMessage) && empty($state['printer_model_id'])) {
            $printer = $this->printerResolver->findById((int) $trimmedMessage);

            if ($printer) {
                $state['printer_model_id'] = $printer->id;
                $state['printer_query'] = $printer->printer_name;
                unset($state['printer_options']);

                $session->state = $state;
                $session->save();

                $missing = $this->getMissingFields($state);

                if (!empty($missing)) {
                    return [
                        'reply' => "Got it — I selected {$printer->printer_name}.\n\n" . $this->buildNextStepReply($state, $missing),
                        'stage' => 'collecting',
                        'state' => $state,
                    ];
                }

                $session->stage = 'confirming';
                $session->state = $state;
                $session->save();

                return [
                    'reply' => $this->buildSummary($state) . "\n\nEverything looks good. Do you want me to create the draft now?",
                    'stage' => 'confirming',
                    'state' => $state,
                ];
            }
        }

        // If the extractor found a printer query and the printer is not yet resolved,
        // search immediately even if other fields are still missing.
        if (!empty($state['printer_model_id']) || empty($state['printer_query'])) {
            return null;
        }

        $options = $this->printerResolver->searchOptions($state['printer_query']);

        if (count($options) === 1) {
            $state['printer_model_id'] = $options[0]['id'];
            $state['printer_query'] = $options[0]['printer_name'];
            unset($state['printer_options']);

            $session->state = $state;
            $session->save();

            $missing = $this->getMissingFields($state);

            if (!empty($missing)) {
                return [
                    'reply' => "I found the printer and selected {$options[0]['printer_name']}.\n\n" . $this->buildNextStepReply($state, $missing),
                    'stage' => 'collecting',
                    'state' => $state,
                ];
            }

            $session->stage = 'confirming';
            $session->state = $state;
            $session->save();

            return [
                'reply' => $this->buildSummary($state) . "\n\nEverything looks good. Do you want me to create the draft now?",
                'stage' => 'confirming',
                'state' => $state,
            ];
        }

        if (count($options) > 1) {
            $state['printer_options'] = $options;

            $session->state = $state;
            $session->save();

            return [
                'reply' => 'I found a few printer matches. Please choose one below.',
                'stage' => 'collecting',
                'state' => $state,
            ];
        }

        // If the user explicitly tried to provide a printer but nothing matched,
        // respond naturally.
        if ($this->looksLikePrinterIntent($message)) {
            return [
                'reply' => 'I couldn’t find that printer in the database. Try typing part of the model name and I’ll show matching options.',
                'stage' => 'collecting',
                'state' => $state,
            ];
        }

        return null;
    }

    protected function looksLikePrinterIntent(string $message): bool
    {
        $normalized = strtolower(trim($message));

        $keywords = [
            'printer',
            'model',
            'machine',
            'canon',
            'epson',
            'hp',
            'xerox',
            'ricoh',
            'kyocera',
            'brother',
            'sharp',
            'konica',
            'minolta',
            'toshiba',
        ];

        foreach ($keywords as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return true;
            }
        }

        return false;
    }

    protected function stateChanged(array $before, array $after): bool
    {
        ksort($before);
        ksort($after);

        return $before !== $after;
    }

    protected function getMissingFields(array $state): array
    {
        $required = [
            'company_name',
            'contract_type',
            'contract_years',
            'purpose',
            'mono_yield_monthly',
            'color_yield_monthly',
            'printer_model_id',
        ];

        $missing = [];

        foreach ($required as $field) {
            if (!array_key_exists($field, $state) || $state[$field] === null || $state[$field] === '') {
                $missing[] = $field;
            }
        }

        foreach ($this->requiredFees($state) as $feeField) {
            if (!array_key_exists($feeField, $state) || $state[$feeField] === null || $state[$feeField] === '') {
                $missing[] = $feeField;
            }
        }

        return $missing;
    }

    protected function requiredFees(array $state): array
    {
        $contractType = strtolower(trim($state['contract_type'] ?? ''));

        return match ($contractType) {
            'free use' => [
                'fee_one_time_charge',
                'fee_shipping',
                'fee_rebate',
                'fee_support_services',
            ],
            'rental + click' => [
                'fee_one_time_charge',
                'fee_shipping',
                'fee_rebate',
                'fee_support_services',
                'fee_a4_a3_mono_click',
                'fee_a4_lgl_color_click',
                'fee_a3_color_click',
            ],
            'fix click' => [
                'fee_one_time_charge',
                'fee_shipping',
                'fee_rebate',
                'fee_support_services',
                'fee_a4_a3_mono_click',
                'fee_a4_lgl_color_click',
                'fee_a3_color_click',
            ],
            'rental + supplies' => [
                'fee_one_time_charge',
                'fee_shipping',
                'fee_rebate',
                'fee_support_services',
                'fee_rental_supplies',
            ],
            default => [],
        };
    }

    protected function buildSmartReply(array $state, array $missing): string
    {
        $captured = $this->buildCapturedLines($state);

        $lines = [];

        if (!empty($captured)) {
            $lines[] = 'Got it — here’s what I captured so far:';
            $lines[] = implode("\n", $captured);
            $lines[] = '';
        }

        $lines[] = $this->buildNextStepReply($state, $missing);

        return implode("\n", array_filter($lines, fn ($line) => $line !== ''));
    }

    protected function buildUpdatedReply(array $state, array $missing): string
    {
        $captured = $this->buildCapturedLines($state);

        $lines = [
            'Updated — I applied the changes.',
        ];

        if (!empty($captured)) {
            $lines[] = '';
            $lines[] = 'Here’s the latest draft info:';
            $lines[] = implode("\n", $captured);
        }

        if (!empty($missing)) {
            $lines[] = '';
            $lines[] = $this->buildNextStepReply($state, $missing);
        }

        return implode("\n", $lines);
    }

    protected function buildNextStepReply(array $state, array $missing): string
    {
        if (count($missing) === 1) {
            $field = $missing[0];

            return match ($field) {
                'printer_model_id' => 'I still need the printer model. Type the model name and I’ll show matching options from the database.',
                'company_name' => 'I still need the client/company name.',
                default => 'I still need ' . $this->friendlyFieldLabel($field) . '.',
            };
        }

        $lines = ['I still need:'];

        foreach ($missing as $field) {
            if ($field === 'printer_model_id') {
                $lines[] = '- the printer model (type the model name and I’ll show matching options from the database)';
                continue;
            }

            $lines[] = '- ' . $this->friendlyFieldLabel($field);
        }

        return implode("\n", $lines);
    }

    protected function buildCapturedLines(array $state): array
    {
        $captured = [];

        if (!empty($state['company_name'])) {
            $captured[] = '- Company: ' . $state['company_name'];
        }

        if (!empty($state['contract_type'])) {
            $captured[] = '- Contract: ' . $state['contract_type'];
        }

        if (!empty($state['contract_years'])) {
            $captured[] = '- Term: ' . $state['contract_years'] . ' year' . ((int) $state['contract_years'] > 1 ? 's' : '');
        }

        if (!empty($state['purpose'])) {
            $captured[] = '- Purpose: ' . $state['purpose'];
        }

        if (!empty($state['mono_yield_monthly'])) {
            $captured[] = '- Mono: ' . number_format((float) $state['mono_yield_monthly']) . '/month';
        }

        if (!empty($state['color_yield_monthly'])) {
            $captured[] = '- Color: ' . number_format((float) $state['color_yield_monthly']) . '/month';
        }

        if (!empty($state['printer_query'])) {
            $captured[] = '- Printer: ' . $state['printer_query'];
        }

        foreach ($this->requiredFees($state) as $feeField) {
            if (!empty($state[$feeField])) {
                $captured[] = '- ' . $this->feeLabel($feeField) . ': ' . $state[$feeField];
            }
        }

        return $captured;
    }

    protected function friendlyFieldLabel(string $field): string
    {
        return match ($field) {
            'company_name' => 'the client/company name',
            'contract_type' => 'the contract type',
            'contract_years' => 'the contract duration',
            'purpose' => 'the project purpose',
            'mono_yield_monthly' => 'the monthly mono volume',
            'color_yield_monthly' => 'the monthly color volume',
            'printer_model_id' => 'the printer model',
            'fee_one_time_charge' => 'the One Time Charge amount',
            'fee_shipping' => 'the Shipping amount',
            'fee_rebate' => 'the Rebate amount',
            'fee_support_services' => 'the Support Services amount',
            'fee_rental_supplies' => 'the Rental + Supplies amount',
            'fee_a4_a3_mono_click' => 'the A4/A3 Mono Click rate',
            'fee_a4_lgl_color_click' => 'the A4/LGL Color Click rate',
            'fee_a3_color_click' => 'the A3 Color Click rate',
            default => str_replace('_', ' ', $field),
        };
    }

    protected function feeLabel(string $field): string
    {
        return match ($field) {
            'fee_one_time_charge' => 'One Time Charge',
            'fee_shipping' => 'Shipping',
            'fee_rebate' => 'Rebate',
            'fee_support_services' => 'Support Services',
            'fee_rental_supplies' => 'Rental + Supplies',
            'fee_a4_a3_mono_click' => 'A4/A3 MONO CLICK',
            'fee_a4_lgl_color_click' => 'A4/LGL COLOR CLICK',
            'fee_a3_color_click' => 'A3 COLOR CLICK',
            default => str($field)->replace('_', ' ')->title(),
        };
    }

    protected function buildSummary(array $state): string
    {
        $lines = [
            'Here’s the draft summary:',
            '- Company Name: ' . ($state['company_name'] ?? '-'),
            '- Contract Type: ' . ($state['contract_type'] ?? '-'),
            '- Contract Years: ' . ($state['contract_years'] ?? '-'),
            '- Purpose: ' . ($state['purpose'] ?? '-'),
            '- Monthly Mono Yield: ' . ($state['mono_yield_monthly'] ?? '-'),
            '- Monthly Color Yield: ' . ($state['color_yield_monthly'] ?? '-'),
            '- Printer: ' . ($state['printer_query'] ?? '-'),
        ];

        foreach ($this->requiredFees($state) as $feeField) {
            $lines[] = '- ' . $this->feeLabel($feeField) . ': ' . ($state[$feeField] ?? '-');
        }

        return implode("\n", $lines);
    }
}