<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class RoiValueExtractionService
{
    public function __construct(
        protected GeminiExtractionService $geminiExtractionService
    ) {
    }

    public function extract(array $state, string $message): array
    {
        $message = trim($message);
        $normalized = strtolower($message);

        if ($message === '' || $this->isGreeting($normalized)) {
            Log::info('ROI extractor skipped', [
                'reason' => 'empty_or_greeting',
                'message' => $message,
            ]);

            return $state;
        }

        $before = $state;

        $state = $this->extractCompanyEdits($state, $message);
        $state = $this->extractContractTypeEdits($state, $message);
        $state = $this->extractContractYearsEdits($state, $message);
        $state = $this->extractPurposeEdits($state, $message);
        $state = $this->extractYieldEdits($state, $message);
        $state = $this->extractPrinterQueryEdits($state, $message);
        $state = $this->extractFeeEdits($state, $message);

        $usedAi = $this->shouldUseAi($before, $state, $message);

        Log::info('ROI extractor decision', [
            'message' => $message,
            'used_ai' => $usedAi,
            'state_before' => $before,
            'state_after_local' => $state,
        ]);

        if ($usedAi) {
            Log::info('Calling Gemini extraction', [
                'message' => $message,
                'state_before_ai_merge' => $state,
            ]);

            $aiData = $this->geminiExtractionService->extract($state, $message);

            Log::info('Gemini extraction response', [
                'message' => $message,
                'ai_data' => $aiData,
            ]);

            $state = $this->mergeAiData($state, $aiData);

            Log::info('State after Gemini merge', [
                'message' => $message,
                'state_after_ai_merge' => $state,
            ]);
        }

        return $state;
    }

    protected function shouldUseAi(array $before, array $after, string $message): bool
    {
        $normalized = strtolower($message);

        if (mb_strlen($message) > 80) {
            return true;
        }

        $signals = [
            'actually',
            'instead',
            'change',
            'update',
            'revise',
            'make it',
            'correction',
            'use ',
        ];

        foreach ($signals as $signal) {
            if (str_contains($normalized, $signal)) {
                return true;
            }
        }

        $beforeCount = count(array_filter($before, fn ($v) => $v !== null && $v !== ''));
        $afterCount = count(array_filter($after, fn ($v) => $v !== null && $v !== ''));

        return $afterCount <= $beforeCount;
    }

    protected function mergeAiData(array $state, array $aiData): array
    {
        foreach ($aiData as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            if (in_array($key, [
                'company_name',
                'contract_type',
                'contract_years',
                'purpose',
                'mono_yield_monthly',
                'color_yield_monthly',
                'printer_query',
                'fee_one_time_charge',
                'fee_shipping',
                'fee_rebate',
                'fee_support_services',
                'fee_rental_supplies',
                'fee_a4_a3_mono_click',
                'fee_a4_lgl_color_click',
                'fee_a3_color_click',
            ], true)) {
                $state[$key] = $value;
            }
        }

        return $state;
    }

    protected function isGreeting(string $normalized): bool
    {
        $greetings = [
            'hello',
            'hi',
            'hey',
            'good morning',
            'good afternoon',
            'good evening',
        ];

        return in_array($normalized, $greetings, true);
    }

    protected function extractCompanyEdits(array $state, string $message): array
    {
        if (preg_match('/\b(?:company|client)\s*(?:is|=|:)?\s*([^,]+)(?:,|$)/i', $message, $matches)) {
            $candidate = trim($matches[1], " \t\n\r\0\x0B,.-");
            if ($this->isReasonableCompanyName($candidate)) {
                $state['company_name'] = $candidate;
                return $state;
            }
        }

        if (preg_match('/\buse\s+([^,]+?)(?:\s+instead)?(?:,|$)/i', $message, $matches)) {
            $candidate = trim($matches[1], " \t\n\r\0\x0B,.-");
            if ($this->isReasonableCompanyName($candidate)) {
                $state['company_name'] = $candidate;
                return $state;
            }
        }

        if (empty($state['company_name']) && !$this->looksStructuredInstruction($message)) {
            $parts = preg_split('/,/', $message);
            if (!empty($parts)) {
                $candidate = trim($parts[0], " \t\n\r\0\x0B,.-");
                if ($this->isReasonableCompanyName($candidate)) {
                    $state['company_name'] = $candidate;
                }
            }
        }

        return $state;
    }

    protected function extractContractTypeEdits(array $state, string $message): array
    {
        $normalized = strtolower($message);
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        $normalized = str_replace(['+click', '+supplies'], [' + click', ' + supplies'], $normalized);
        $normalized = preg_replace('/\s*\+\s*/', ' + ', $normalized);

        if (str_contains($normalized, 'free use')) {
            $state['contract_type'] = 'Free Use';
            return $state;
        }

        if (
            str_contains($normalized, 'rental + click') ||
            str_contains($normalized, 'rental click')
        ) {
            $state['contract_type'] = 'Rental + Click';
            return $state;
        }

        if (str_contains($normalized, 'fix click')) {
            $state['contract_type'] = 'Fix Click';
            return $state;
        }

        if (
            str_contains($normalized, 'rental + supplies') ||
            str_contains($normalized, 'rental supplies') ||
            (str_contains($normalized, 'rental') && str_contains($normalized, 'supplies'))
        ) {
            $state['contract_type'] = 'Rental + Supplies';
            return $state;
        }

        return $state;
    }

    protected function extractContractYearsEdits(array $state, string $message): array
    {
        if (preg_match('/(?:contract\s*term\s*(?:is|=|:)?\s*)?(\d+)\s*(year|years|yr|yrs)\b/i', $message, $matches)) {
            $state['contract_years'] = (int) $matches[1];
            return $state;
        }

        if (preg_match('/\b(?:make it|change (?:it|term|contract|years?) to)\s+(\d+)\b/i', $message, $matches)) {
            $value = (int) $matches[1];
            if ($value > 0 && $value <= 10) {
                $state['contract_years'] = $value;
            }
            return $state;
        }

        if (preg_match('/^\d+$/', trim($message))) {
            $value = (int) trim($message);
            if ($value > 0 && $value <= 10 && empty($state['contract_years'])) {
                $state['contract_years'] = $value;
            }
        }

        return $state;
    }

    protected function extractPurposeEdits(array $state, string $message): array
    {
        if (preg_match('/\bpurpose\s*(?:is|=|:)?\s*([^,]+)(?:,|$)/i', $message, $matches)) {
            $candidate = trim($matches[1], " \t\n\r\0\x0B,.-");
            if ($candidate !== '') {
                $state['purpose'] = $candidate;
                return $state;
            }
        }

        if (preg_match('/\b(?:change|update|make)\s+purpose\s+(?:to\s+)?([^,]+)(?:,|$)/i', $message, $matches)) {
            $candidate = trim($matches[1], " \t\n\r\0\x0B,.-");
            if ($candidate !== '') {
                $state['purpose'] = $candidate;
                return $state;
            }
        }

        $normalized = strtolower($message);

        $purposeMap = [
            'renewal' => 'Renewal',
            'renew' => 'Renewal',
            'replacement' => 'Replacement',
            'replace' => 'Replacement',
            'upgrade' => 'Upgrade',
            'new deal' => 'New Deal',
            'new project' => 'New Deal',
        ];

        foreach ($purposeMap as $keyword => $value) {
            if (preg_match('/\b' . preg_quote($keyword, '/') . '\b/i', $normalized)) {
                $state['purpose'] = $value;
                return $state;
            }
        }

        return $state;
    }

    protected function extractYieldEdits(array $state, string $message): array
    {
        if (preg_match('/\b(?:change|update|make)\s+mono\s+(?:to\s+)?(\d+(?:\.\d+)?)(k)?\b/i', $message, $matches)) {
            $state['mono_yield_monthly'] = $this->normalizeMagnitudeNumber($matches[1], $matches[2] ?? null);
        } elseif (preg_match('/(\d+(?:\.\d+)?(?:,\d{3})?)(k)?\s*(mono|bw|black)\b/i', $message, $matches)) {
            $state['mono_yield_monthly'] = $this->normalizeMagnitudeNumber($matches[1], $matches[2] ?? null);
        } elseif (preg_match('/\b(mono|bw|black)\s*(?:yield)?\s*(?:is|=|:|to)?\s*(\d+(?:\.\d+)?(?:,\d{3})?)(k)?\b/i', $message, $matches)) {
            $state['mono_yield_monthly'] = $this->normalizeMagnitudeNumber($matches[2], $matches[3] ?? null);
        }

        if (preg_match('/\b(?:change|update|make)\s+color\s+(?:to\s+)?(\d+(?:\.\d+)?)(k)?\b/i', $message, $matches)) {
            $state['color_yield_monthly'] = $this->normalizeMagnitudeNumber($matches[1], $matches[2] ?? null);
        } elseif (preg_match('/(\d+(?:\.\d+)?(?:,\d{3})?)(k)?\s*(color|colour)\b/i', $message, $matches)) {
            $state['color_yield_monthly'] = $this->normalizeMagnitudeNumber($matches[1], $matches[2] ?? null);
        } elseif (preg_match('/\b(color|colour)\s*(?:yield)?\s*(?:is|=|:|to)?\s*(\d+(?:\.\d+)?(?:,\d{3})?)(k)?\b/i', $message, $matches)) {
            $state['color_yield_monthly'] = $this->normalizeMagnitudeNumber($matches[2], $matches[3] ?? null);
        }

        return $state;
    }

    protected function extractPrinterQueryEdits(array $state, string $message): array
    {
        $normalized = strtolower(trim($message));

        $blocked = [
            'give me the models',
            'show me the models',
            'show models',
            'show options',
            'give me options',
            'printer model give me the models',
            'printer give me the models',
        ];

        foreach ($blocked as $phrase) {
            if ($normalized === $phrase) {
                unset($state['printer_query']);
                return $state;
            }
        }

        if (preg_match('/\b(?:printer|model|machine)\s*(?:is|=|:)?\s+(.+)/i', $message, $matches)) {
            $candidate = trim($matches[1], " \t\n\r\0\x0B,.-");
            if ($candidate !== '') {
                $state['printer_query'] = $candidate;
                unset($state['printer_model_id'], $state['printer_options']);
                return $state;
            }
        }

        $brands = [
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

        foreach ($brands as $brand) {
            if (preg_match('/\b' . preg_quote($brand, '/') . '\b/i', $normalized)) {
                $state['printer_query'] = $message;
                unset($state['printer_model_id'], $state['printer_options']);
                return $state;
            }
        }

        return $state;
    }

    protected function extractFeeEdits(array $state, string $message): array
    {
        $feePatterns = [
            'fee_one_time_charge' => 'one[\s-]*time charge',
            'fee_shipping' => 'shipping',
            'fee_rebate' => 'rebate',
            'fee_support_services' => 'support services',
            'fee_rental_supplies' => 'rental[\s+]*supplies',
            'fee_a4_a3_mono_click' => 'a4\/a3 mono click|mono click',
            'fee_a4_lgl_color_click' => 'a4\/lgl color click|lgl color click',
            'fee_a3_color_click' => 'a3 color click',
        ];

        foreach ($feePatterns as $field => $pattern) {
            if (preg_match('/(?:' . $pattern . ')\s*(?:is|=|:|to)?\s*([\d,.]+(?:\.\d+)?)/i', $message, $matches)) {
                $value = $this->parseNumber($matches[1]);
                if ($value !== null) {
                    $state[$field] = $value;
                }
            }
        }

        $requiredFees = $this->requiredFees($state);
        $missingFees = array_values(array_filter($requiredFees, function ($field) use ($state) {
            return !array_key_exists($field, $state) || $state[$field] === null || $state[$field] === '';
        }));

        if (count($missingFees) === 1 && $this->looksLikePureNumberReply($message)) {
            $value = $this->parseNumber($message);
            if ($value !== null) {
                $state[$missingFees[0]] = $value;
            }
        }

        return $state;
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

    protected function looksStructuredInstruction(string $message): bool
    {
        $normalized = strtolower($message);

        return
            str_contains($normalized, 'contract') ||
            str_contains($normalized, 'purpose') ||
            str_contains($normalized, 'mono') ||
            str_contains($normalized, 'color') ||
            str_contains($normalized, 'printer') ||
            str_contains($normalized, 'model');
    }

    protected function normalizeMagnitudeNumber(string $number, ?string $kSuffix = null): int
    {
        $value = (float) str_replace(',', '', $number);

        if ($kSuffix !== null && strtolower($kSuffix) === 'k') {
            $value *= 1000;
        }

        return (int) round($value);
    }

    protected function parseNumber(string $message): int|float|null
    {
        $cleaned = preg_replace('/[^\d.\-]/', '', str_replace(',', '', $message));

        if ($cleaned === '' || $cleaned === '-' || $cleaned === '.') {
            return null;
        }

        if (preg_match('/-?\d+(\.\d+)?/', $cleaned, $matches)) {
            $number = $matches[0];

            return str_contains($number, '.')
                ? (float) $number
                : (int) $number;
        }

        return null;
    }

    protected function isReasonableCompanyName(string $value): bool
    {
        $value = trim($value);

        if ($value === '' || mb_strlen($value) < 2 || preg_match('/^\d+$/', $value)) {
            return false;
        }

        $normalized = strtolower($value);

        $invalidExact = [
            'yes',
            'no',
            'confirm',
            'create',
            'create draft',
            'renewal',
            'replacement',
            'upgrade',
            'free use',
            'fix click',
            'rental + click',
            'rental + supplies',
        ];

        return !in_array($normalized, $invalidExact, true);
    }

    protected function looksLikeConfirmationReply(string $message): bool
    {
        $normalized = strtolower(trim($message));

        return in_array($normalized, [
            'yes',
            'y',
            'no',
            'n',
            'confirm',
            'create',
            'create draft',
            'cancel',
            'not yet',
        ], true);
    }

    protected function looksLikePureNumberReply(string $message): bool
    {
        return preg_match('/^\s*[\d,]+(?:\.\d+)?\s*$/', $message) === 1;
    }
}