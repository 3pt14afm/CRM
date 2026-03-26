<?php

namespace App\Support;

use App\Models\Preferences;
use Carbon\Carbon;

class PreferenceHelper
{
    public static function record(string $settingsId): ?Preferences
    {
        return Preferences::query()
            ->where('settings_id', $settingsId)
            ->where('is_active', true)
            ->first();
    }

    public static function value(string $settingsId, $default = null)
    {
        $preference = self::record($settingsId);

        return $preference?->setting_value ?? $default;
    }

    public static function numeric(string $settingsId, int $default = 0): int
    {
        return (int) self::value($settingsId, $default);
    }

    public static function attribute(string $settingsId, ?string $default = null): ?string
    {
        $preference = self::record($settingsId);

        return $preference?->entity_attribute
            ? strtolower((string) $preference->entity_attribute)
            : $default;
    }

    public static function dateFromNow(
        string $settingsId,
        int $defaultValue = 0,
        string $defaultAttribute = 'day'
    ): Carbon {
        $value = self::numeric($settingsId, $defaultValue);
        $attribute = strtolower((string) self::attribute($settingsId, $defaultAttribute));

        return match ($attribute) {
            'month' => now()->addMonths($value),
            'year' => now()->addYears($value),
            default => now()->addDays($value),
        };
    }

    public static function passwordExpiryDate(): Carbon
    {
        return self::dateFromNow('PWX', 90, 'day');
    }

    public static function passwordExpiryValue(): int
    {
        return self::numeric('PWX', 90);
    }

    public static function passwordExpiryAttribute(): string
    {
        return (string) self::attribute('PWX', 'day');
    }
}