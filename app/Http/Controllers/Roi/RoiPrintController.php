<?php

namespace App\Http\Controllers\Roi;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\RoiEntryProject;
use App\Models\RoiCurrentProject;
use App\Models\RoiArchiveProject;
use Inertia\Inertia;

class RoiPrintController extends Controller
{
    public function printEntry($id) {
        return $this->renderPrint(RoiEntryProject::class, $id, 'entry', true);
    }

    public function printCurrent($id) {
        return $this->renderPrint(RoiCurrentProject::class, $id, 'current', false);
    }

    public function printArchive($id) {
        return $this->renderPrint(RoiArchiveProject::class, $id, 'archive', false);
    }

    private function renderPrint($modelClass, $id, $route, $showDraftWatermark)
    {
        $p = $modelClass::with(['items', 'fees', 'user'])->findOrFail($id);

        $userIds = collect([
            $p->user_id, $p->status_updated_by, $p->reviewed_by,
            $p->checked_by, $p->endorsed_by, $p->confirmed_by,
            $p->approved_by, $p->rejected_by
        ])->filter()->unique()->values();

        $usersById = User::query()
            ->whereIn('id', $userIds)
            ->get(['id', 'first_name', 'last_name', 'position', 'employee_id'])
            ->keyBy(fn ($u) => (string) $u->id)
            ->map(fn ($u) => [
                'id'       => $u->id,
                'name'     => trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')),
                'position' => $u->position ?? '—',
            ]);

        $signatureFor = function ($userId) use ($usersById) {
            if (!$userId) return null;
            $employeeId = User::find($userId)?->employee_id;
            if (!$employeeId) return null;
            foreach (['png', 'jpg', 'jpeg', 'webp'] as $ext) {
                $path = storage_path('app/public/signatures/' . $employeeId . '.' . $ext);
                if (file_exists($path)) {
                    return asset('storage/signatures/' . $employeeId . '.' . $ext) . '?v=' . filemtime($path);
                }
            }
            return null;
        };

        $signatures = [
            'preparer'     => $signatureFor($p->user_id),
            'reviewed_by'  => $signatureFor($p->reviewed_by),
            'checked_by'   => $signatureFor($p->checked_by),
            'endorsed_by'  => $signatureFor($p->endorsed_by),
            'confirmed_by' => $signatureFor($p->confirmed_by),
            'approved_by'  => $signatureFor($p->approved_by),
        ];

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
            'tab'               => request('tab', 'summary'),
            'storageKey'        => request('storageKey'),
            'autoprint'         => (bool) request('autoprint', false),
            'showDraftWatermark'=> $showDraftWatermark,
            'entryProject'      => $p,
            'usersById'         => $usersById,
            'route'             => $route,
            'signatures'        => $signatures,
        ]);
    }
}