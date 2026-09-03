<?php

namespace App\Http\Requests\Roi\Entry;

use App\Models\RoiEntryProject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class StoreRoiGroupDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'companyInfo.reference' => ['nullable', 'string', 'max:255'],
            'companyInfo.type' => ['nullable', 'integer', 'in:0,1'],
            'companyInfo.companyName' => ['required', 'string', 'max:255'],
            'companyInfo.companySapCode' => ['nullable', 'string', 'max:255'],

            'entries' => ['required', 'array', 'min:1'],
            'entries.*.projectUid' => ['nullable', 'string', 'max:255'],
            'entries.*.companyInfo.contractYears' => ['required', 'integer', 'min:0'],
            'entries.*.companyInfo.contractType' => ['required', 'string', 'max:255'],
            'entries.*.companyInfo.purpose' => ['nullable', 'string', 'max:5000'],
            'entries.*.companyInfo.bundledStdInk' => ['nullable'],

            'entries.*.interest.annualInterest' => ['nullable'],
            'entries.*.interest.percentMargin' => ['nullable'],

            'entries.*.yield.monoAmvpYields.monthly' => ['nullable'],
            'entries.*.yield.colorAmvpYields.monthly' => ['nullable'],

            'entries.*.entryRemarks' => ['nullable', 'array'],
            'entries.*.entryRemarks.remarks' => ['nullable', 'string', 'max:5000'],
            'entries.*.entryRemarks.attachments' => ['nullable', 'array'],

            'entries.*.entry_remarks_attachments' => ['nullable', 'array', 'max:3'],
            'entries.*.entry_remarks_attachments.*' => ['file', 'max:10240'],

            'entries.*.machineConfiguration.machine' => ['nullable', 'array'],
            'entries.*.machineConfiguration.consumable' => ['nullable', 'array'],
            'entries.*.machineConfiguration.totals' => ['nullable', 'array'],

            'entries.*.additionalFees.company' => ['nullable', 'array'],
            'entries.*.additionalFees.customer' => ['nullable', 'array'],
            'entries.*.additionalFees.total' => ['nullable'],

            'entries.*.totalProjectCost' => ['nullable', 'array'],
            'entries.*.yearlyBreakdown' => ['nullable', 'array'],
        ];
    }

    protected function passedValidation(): void
    {
        $entries = $this->input('entries', []);
        $errors = [];

        foreach ($entries as $i => $entry) {
            $monoMonthly = (float) data_get($entry, 'yield.monoAmvpYields.monthly', 0);
            $colorMonthly = (float) data_get($entry, 'yield.colorAmvpYields.monthly', 0);

            if ($monoMonthly <= 4000 && $colorMonthly <= 2000) {
                continue;
            }

            $remarks = trim((string) data_get($entry, 'entryRemarks.remarks', ''));
            $newAttachmentsCount = count(Arr::wrap($this->file("entries.$i.entry_remarks_attachments")));

            if ($this->has("entries.$i.entryRemarks.attachments")) {
                // Attachment state explicitly present for this entry → trust it fully.
                $keptAttachmentsCount = collect(data_get($entry, 'entryRemarks.attachments', []))
                    ->filter(fn ($item) => is_array($item) && !empty($item['id']))
                    ->count();
            } else {
                // Omitted → fall back to what's already persisted for this entry.
                $projectUid = data_get($entry, 'projectUid');
                $project = $projectUid ? RoiEntryProject::where('project_uid', $projectUid)->first() : null;
                $persistedAttachments = $project?->entry_remarks_attachments;
                $keptAttachmentsCount = is_array($persistedAttachments) ? count($persistedAttachments) : 0;
            }

            $totalAttachmentsCount = $keptAttachmentsCount + $newAttachmentsCount;

            if ($remarks === '') {
                $errors["entries.$i.entryRemarks.remarks"] =
                    'Entry ' . ($i + 1) . ': Remarks are required when Mono AMPV is more than 4,000 or Color AMVP is more than 2,000.';
            }
            if ($totalAttachmentsCount < 1) {
                $errors["entries.$i.entry_remarks_attachments"] =
                    'Entry ' . ($i + 1) . ': At least one attachment is required when Mono AMPV is more than 4,000 or Color AMVP is more than 2,000.';
            }
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }
}