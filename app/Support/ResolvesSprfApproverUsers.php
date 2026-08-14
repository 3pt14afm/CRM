<?php

namespace App\Support;

use App\Models\User;

trait ResolvesSprfApproverUsers
{
    private function resolveApproverUsers(): array
    {
        return [
            'directorCustomerEngagement' => $this->findActiveUserByPosition('Director - Customer Engagement'),
            'esdDirector'                => $this->findActiveUserByPosition('Director - Enterprise Solutions'),
            'vpCcto'                     => $this->findActiveUserByPosition('VP & CCTO'),
            'presidentCeo'               => $this->findActiveUserByPosition('President & CEO'),
        ];
    }

    private function findActiveUserByPosition(string $position): ?array
    {
        $user = User::query()
            ->where('position', $position)
            ->where('is_banned', false)
            ->first(['id', 'first_name', 'last_name', 'position', 'email']);

        if (! $user) return null;

        return [
            'id'       => $user->id,
            'name'     => $user->name,
            'position' => $user->position,
            'email'    => $user->email,
        ];
    }
}