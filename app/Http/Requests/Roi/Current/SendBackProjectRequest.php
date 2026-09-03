<?php

namespace App\Http\Requests\Roi\Current;

use Illuminate\Foundation\Http\FormRequest;

class SendBackProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization logic can still be verified in the service/controller if needed
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:2000'],
            'type' => ['required', 'in:note,comment'],
            'target_entry_id' => ['nullable', 'integer', 'exists:roi_current_projects,id'],
        ];
    }
}