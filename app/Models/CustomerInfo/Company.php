<?php

namespace App\Models\CustomerInfo;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;

    // Prefix the database name before the table name
    protected $table = 'erms.tbl_company';

    // Disable timestamps if your table doesn't use standard created_at/updated_at columns,
    // though your diagram shows they exist, so keeping them active is perfect.
    public $timestamps = true;

    /**
     * The attributes that are mass assignable.
     * Add any fields here that you plan to create or update via forms later.
     */
    protected $fillable = [
        'sap_code',
        'company_name',
        'client_category',
        'address',
        'main_location',
        'branches',
        'client_type',
        'mark',
        'contact_no',
        'id_client_mngr',
        'status',
        'delsan_company',
        'date_last_visit',
        'latitude',
        'longitude',
    ];

    /**
     * Optional: Cast attributes to native types if needed.
     * Useful for flags or coordinates.
     */
    protected $casts = [
        'status' => 'integer',
        'latitude' => 'float',
        'longitude' => 'float',
        // 'date_last_visit' => 'date',
    ];

    public function clientManager()
    {
        return $this->belongsTo(User::class, 'id_client_mngr');
    }
}