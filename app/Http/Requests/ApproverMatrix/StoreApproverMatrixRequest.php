<?php

namespace App\Http\Requests\ApproverMatrix;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApproverMatrixRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'location_id' => ['required', 'integer', 'exists:locations,id'],
            'department_id' => ['required', 'integer', 'exists:company_departments,id'],

            'reviewed_by' => ['nullable', 'integer', 'exists:users,id'],
            'checked_by' => ['nullable', 'integer', 'exists:users,id'],
            'endorsed_by' => ['nullable', 'integer', 'exists:users,id'],
            'confirmed_by' => ['nullable', 'integer', 'exists:users,id'],
            'approved_by' => ['nullable', 'integer', 'exists:users,id'],

            'status' => ['required', 'string', Rule::in(['Active', 'Inactive'])],
        ];
    }
}