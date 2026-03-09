<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'employee_id',
        'department_id',
        'position',
        'email',
        'password',
        'primary_location_id',
        'is_banned',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at'   => 'datetime',
            'password'            => 'hashed',
            'is_banned'           => 'boolean',
            'primary_location_id' => 'integer',
        ];
    }

    public function setEmployeeIdAttribute($value): void
    {
        $this->attributes['employee_id'] = str_pad((string) $value, 4, '0', STR_PAD_LEFT);
    }

    public function department()
    {
        return $this->belongsTo(\App\Models\CompanyDepartment::class, 'department_id');
    }
}