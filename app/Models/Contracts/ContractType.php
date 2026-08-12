<?php

namespace App\Models\Contracts;

use Illuminate\Database\Eloquent\Model;

class ContractType extends Model
{
    protected $table = 'contract_type';

    protected $fillable = [
        'name',
        'status',
    ];

    protected $casts = [
        'status' => 'boolean',
    ];
}