<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Preferences;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PreferencesController extends Controller
{
    public function preferenceMaster(Request $request)
    {
        $search = $request->input('search');

        $preferences = Preferences::query()
            ->when($search, function ($q) use ($search) {
                $q->where('settings_id', 'like', "%{$search}%")
                  ->orWhere('settings_key', 'like', "%{$search}%")
                  ->orWhere('entity_attribute', 'like', "%{$search}%");
            })
            ->orderBy('settings_id')
            ->paginate(10)
            ->through(function ($preference) {
                $preference->status = $preference->is_active ? 'Active' : 'Inactive';
                return $preference;
            })
            ->withQueryString();

        $stats = [
            'totalPreferences' => Preferences::count(),
            'activePreferences' => Preferences::where('is_active', true)->count(),
        ];

        return Inertia::render('Admin/Preferences', [
            'preferences' => $preferences,
            'stats' => $stats,
        ]);
    }

    public function preferenceStore(Request $request)
    {
        $request->validate([
            'settings_id' => 'required|string|max:50|unique:preferences,settings_id',
            'settings_key' => 'required|string|max:255',
            'setting_value' => 'required|integer|min:0',
            'entity_attribute' => 'required|in:day,week,month,year',
        ]);

        Preferences::create([
            'settings_id' => strtoupper($request->settings_id),
            'settings_key' => $request->settings_key,
            'setting_value' => $request->setting_value,
            'entity_attribute' => strtolower($request->entity_attribute),
            'is_active' => true,
        ]);

        return back()->with('success', 'Preference created.');
    }

    public function preferenceUpdate(Request $request, Preferences $preference)
    {
        $request->validate([
            'settings_key' => 'required|string|max:255',
            'setting_value' => 'required|integer|min:0',
            'entity_attribute' => 'required|in:day,week,month,year',
        ]);

        $preference->update([
            'settings_key' => $request->settings_key,
            'setting_value' => $request->setting_value,
            'entity_attribute' => strtolower($request->entity_attribute),
        ]);

        return back()->with('success', 'Preference updated.');
    }

    public function preferenceActivate(Preferences $preference)
    {
        $preference->update(['is_active' => true]);
        return back()->with('success', 'Preference activated.');
    }

    public function preferenceDeactivate(Preferences $preference)
    {
        $preference->update(['is_active' => false]);
        return back()->with('success', 'Preference deactivated.');
    }
}