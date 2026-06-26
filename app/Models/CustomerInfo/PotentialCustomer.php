<?php

namespace App\Models\CustomerInfo;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class PotentialCustomer extends Model
{
    protected $fillable = [
        'company_name',
        'address',
        'contact_no',
        'id_client_mngr',
        'status',
    ];

    public function clientManager()
    {
        return $this->belongsTo(User::class, 'id_client_mngr');
    }
}