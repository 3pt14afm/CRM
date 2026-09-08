<?php

namespace App\Models\Contracts;

use Illuminate\Database\Eloquent\Model;

class ContractExtension extends Model
{
    protected $fillable = ['contract_id', 'date', 'extended_at', 'extended_by', 'pdf_path'];
    protected $casts = ['date' => 'date', 'extended_at' => 'datetime'];

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }
}