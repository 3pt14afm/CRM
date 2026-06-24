<?php

namespace App\Http\Requests\Roi\Entry;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class StoreRoiDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'companyInfo.reference' => ['nullable', 'string', 'max:255'],
            'companyInfo.projectUid' => ['nullable', 'string', 'max:255'],
            'companyInfo.companyName' => ['required', 'string', 'max:255'],
            'companyInfo.companySapCode' => ['nullable', 'string', 'max:255'],
            'companyInfo.contractYears' => ['required', 'integer', 'min:0'],
            'companyInfo.contractType' => ['required', 'string', 'max:255'],
            'companyInfo.purpose' => ['nullable', 'string', 'max:5000'],
            'companyInfo.bundledStdInk' => ['nullable'],

            'interest.annualInterest' => ['nullable'],
            'interest.percentMargin' => ['nullable'],

            'yield.monoAmvpYields.monthly' => ['nullable'],
            'yield.colorAmvpYields.monthly' => ['nullable'],

            'entryRemarks' => ['nullable', 'array'],
            'entryRemarks.remarks' => ['nullable', 'string', 'max:5000'],
            'entryRemarks.attachments' => ['nullable', 'array'],

            'entry_remarks_attachments' => ['nullable', 'array', 'max:3'],
            'entry_remarks_attachments.*' => [
                'file',
                'max:10240',
               
            ],

            'machineConfiguration.machine' => ['nullable', 'array'],
            'machineConfiguration.consumable' => ['nullable', 'array'],
            'machineConfiguration.totals' => ['nullable', 'array'],

            'additionalFees.company' => ['nullable', 'array'],
            'additionalFees.customer' => ['nullable', 'array'],
            'additionalFees.total' => ['nullable'],

            'totalProjectCost' => ['nullable', 'array'],
            'yearlyBreakdown' => ['nullable', 'array'],
        ];
    }

    protected function passedValidation(): void
    {
        $monoMonthly = (float) $this->input('yield.monoAmvpYields.monthly', 0);
        $colorMonthly = (float) $this->input('yield.colorAmvpYields.monthly', 0);

        if ($monoMonthly > 5000 || $colorMonthly > 2500) {
            $remarks = trim((string) $this->input('entryRemarks.remarks', ''));
            $keptAttachmentsCount = collect($this->input('entryRemarks.attachments', []))
                ->filter(fn ($item) => is_array($item) && !empty($item['id']))
                ->count();
            $newAttachmentsCount = count($this->file('entry_remarks_attachments', []) ?? []);
            $totalAttachmentsCount = $keptAttachmentsCount + $newAttachmentsCount;

            $errors = [];
            if ($remarks === '') {
                $errors['entryRemarks.remarks'] = 'Remarks are required when Mono AMVP is more than 5,000 or Color AMVP is more than 2,500.';
            }
            if ($totalAttachmentsCount < 1) {
                $errors['entry_remarks_attachments'] = 'At least one attachment is required when Mono AMVP is more than 5,000 or Color AMVP is more than 2,500.';
            }
            if (!empty($errors)) {
                throw ValidationException::withMessages($errors);
            }
        }
    }
}