<?php

namespace App\Models\SPRF;

use App\Models\CompanyDepartment;
use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SprfApprovalMatrix extends Model
{
    use SoftDeletes;

    protected $table = 'sprf_approval_matrices';

    protected $fillable = [
        'location_id',
        'department_id',

        'director_customer_engagement_user_id',
        'esd_director_user_id',
        'vp_ccto_user_id',
        'president_ceo_user_id',

        'is_active',
        'remarks',

        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function location()
    {
        return $this->belongsTo(Location::class);
    }

    public function department()
    {
        return $this->belongsTo(CompanyDepartment::class, 'department_id');
    }

    public function directorCustomerEngagement()
    {
        return $this->belongsTo(User::class, 'director_customer_engagement_user_id');
    }

    public function esdDirector()
    {
        return $this->belongsTo(User::class, 'esd_director_user_id');
    }

    public function vpCcto()
    {
        return $this->belongsTo(User::class, 'vp_ccto_user_id');
    }

    public function presidentCeo()
    {
        return $this->belongsTo(User::class, 'president_ceo_user_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }
}