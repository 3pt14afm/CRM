<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiExtractionService
{
    public function extract(array $state, string $message): array
    {
        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.model', 'gemini-2-flash');

        if (!$apiKey) {
            Log::warning('Gemini extraction skipped: missing API key');
            return [];
        }

        $prompt = $this->buildPrompt($state, $message);

        Log::info('GeminiExtractionService called', [
            'message' => $message,
            'model' => $model,
            'state_before_request' => $state,
        ]);

        try {
            /** @var Response $response */
            $response = Http::timeout(20)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
                [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.1,
                        'topK' => 1,
                        'topP' => 0.1,
                        'maxOutputTokens' => 1024,
                        'responseMimeType' => 'application/json',
                    ],
                ]
            );

            Log::info('Gemini API raw response received', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            if ($response->failed()) {
                Log::warning('Gemini extraction failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return [];
            }

            $payload = json_decode($response->body(), true);

            if (!is_array($payload)) {
                Log::warning('Gemini extraction invalid payload', [
                    'body' => $response->body(),
                ]);

                return [];
            }

            $text = data_get($payload, 'candidates.0.content.parts.0.text');

            if (!is_string($text) || trim($text) === '') {
                Log::warning('Gemini extraction returned empty text', [
                    'payload' => $payload,
                ]);

                return [];
            }

            $decoded = json_decode($text, true);

            if (!is_array($decoded)) {
                Log::warning('Gemini extraction returned invalid JSON text', [
                    'text' => $text,
                ]);

                return [];
            }

            $sanitized = $this->sanitizeExtractedData($decoded);

            Log::info('Gemini extraction parsed successfully', [
                'raw_decoded' => $decoded,
                'sanitized' => $sanitized,
            ]);

            return $sanitized;
        } catch (\Throwable $e) {
            Log::warning('Gemini extraction exception', [
                'message' => $e->getMessage(),
            ]);

            return [];
        }
    }

    protected function buildPrompt(array $state, string $message): string
    {
        $currentState = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are an information extraction engine for an ROI draft chatbot.

Your job:
- Extract structured ROI draft fields from the user's latest message.
- Use the current state only as context.
- Return JSON only.
- Do not explain anything.
- Do not wrap JSON in markdown.
- Do not invent values.
- If a value is missing or unclear, return null for that field.
- Do not resolve printer_model_id. Only extract printer_query if the user mentions a printer/model/brand.
- If the user is changing an existing value, return the updated value.
- Keep purpose as free text if provided.

Allowed contract_type values:
- Free Use
- Rental + Click
- Fix Click
- Rental + Supplies

Return exactly this JSON structure:
{
  "company_name": null,
  "contract_type": null,
  "contract_years": null,
  "purpose": null,
  "mono_yield_monthly": null,
  "color_yield_monthly": null,
  "printer_query": null,
  "fee_one_time_charge": null,
  "fee_shipping": null,
  "fee_rebate": null,
  "fee_support_services": null,
  "fee_rental_supplies": null,
  "fee_a4_a3_mono_click": null,
  "fee_a4_lgl_color_click": null,
  "fee_a3_color_click": null
}

Rules:
- contract_years must be an integer.
- mono_yield_monthly and color_yield_monthly must be numbers.
- Fee fields must be numbers when present.
- If the message says something like "rental+click" or "rental +click", normalize to "Rental + Click".
- If the message says something like "rental+supplies" or "rental +supplies", normalize to "Rental + Supplies".
- If the message asks to "show models" or "give me the models", do not set printer_query unless a real printer term is also present.
- If purpose is explicitly given, extract only the purpose text, not the rest of the sentence.
- If the company name is not clearly provided, return null.

Current state:
{$currentState}

Latest user message:
{$message}
PROMPT;
    }

    protected function sanitizeExtractedData(array $data): array
    {
        $allowedKeys = [
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
        ];

        $clean = [];

        foreach ($allowedKeys as $key) {
            $value = $data[$key] ?? null;

            if (is_string($value)) {
                $value = trim($value);
                if ($value === '') {
                    $value = null;
                }
            }

            $clean[$key] = $value;
        }

        $clean['contract_type'] = $this->normalizeContractType($clean['contract_type'] ?? null);
        $clean['contract_years'] = $this->toIntOrNull($clean['contract_years'] ?? null);

        $clean['mono_yield_monthly'] = $this->toNumberOrNull($clean['mono_yield_monthly'] ?? null);
        $clean['color_yield_monthly'] = $this->toNumberOrNull($clean['color_yield_monthly'] ?? null);

        $feeFields = [
            'fee_one_time_charge',
            'fee_shipping',
            'fee_rebate',
            'fee_support_services',
            'fee_rental_supplies',
            'fee_a4_a3_mono_click',
            'fee_a4_lgl_color_click',
            'fee_a3_color_click',
        ];

        foreach ($feeFields as $field) {
            $clean[$field] = $this->toNumberOrNull($clean[$field] ?? null);
        }

        if (!$this->isUsefulPrinterQuery($clean['printer_query'] ?? null)) {
            $clean['printer_query'] = null;
        }

        return array_filter(
            $clean,
            fn ($value) => $value !== null && $value !== ''
        );
    }

    protected function normalizeContractType(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        $normalized = strtolower(trim($value));
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        $normalized = str_replace(['+click', '+supplies'], [' + click', ' + supplies'], $normalized);
        $normalized = preg_replace('/\s*\+\s*/', ' + ', $normalized);

        return match (true) {
            str_contains($normalized, 'free use') => 'Free Use',
            str_contains($normalized, 'rental + click'),
            str_contains($normalized, 'rental click') => 'Rental + Click',
            str_contains($normalized, 'fix click') => 'Fix Click',
            str_contains($normalized, 'rental + supplies'),
            str_contains($normalized, 'rental supplies') => 'Rental + Supplies',
            default => null,
        };
    }

    protected function toIntOrNull(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return (int) round((float) $value);
        }

        return null;
    }

    protected function toNumberOrNull(mixed $value): int|float|null
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            $number = (float) $value;
            return fmod($number, 1.0) === 0.0 ? (int) $number : $number;
        }

        if (is_string($value)) {
            $cleaned = preg_replace('/[^\d.\-]/', '', str_replace(',', '', $value));

            if ($cleaned !== null && $cleaned !== '' && is_numeric($cleaned)) {
                $number = (float) $cleaned;
                return fmod($number, 1.0) === 0.0 ? (int) $number : $number;
            }
        }

        return null;
    }

    protected function isUsefulPrinterQuery(?string $value): bool
    {
        if (!$value) {
            return false;
        }

        $normalized = strtolower(trim($value));

        $blocked = [
            'give me the models',
            'show me the models',
            'show models',
            'show options',
            'give me options',
            'printer model give me the models',
            'printer give me the models',
        ];

        return !in_array($normalized, $blocked, true);
    }
}