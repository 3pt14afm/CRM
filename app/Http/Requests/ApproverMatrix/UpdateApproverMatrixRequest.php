<?php

namespace App\Http\Requests\ApproverMatrix;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateApproverMatrixRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $locationDepartment = $this->route('locationDepartment');

        return [
            'location_id' => [
                'required',
                'integer',
                'exists:locations,id',
                Rule::unique('location_departments', 'location_id')
                    ->where(fn ($query) => $query->where('department_id', $this->department_id))
                    ->ignore($locationDepartment?->id),
            ],

            'department_id' => [
                'required',
                'integer',
                'exists:company_departments,id',
            ],

            'reviewed_by' => ['nullable', 'integer', 'exists:users,id'],
            'checked_by' => ['nullable', 'integer', 'exists:users,id'],
            'endorsed_by' => ['nullable', 'integer', 'exists:users,id'],
            'confirmed_by' => ['nullable', 'integer', 'exists:users,id'],
            'approved_by' => ['nullable', 'integer', 'exists:users,id'],

            'status' => [
                'required',
                'string',
                Rule::in(['Active', 'Inactive']),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'location_id.unique' => 'This location and department combination already exists.',
        ];
    }
}