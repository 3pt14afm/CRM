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

    private function normalizeItems($items): array
    {
        return $items->map(fn($r) => [
            'id'                  => $r->id,
            'client_row_id'       => $r->client_row_id ?? null,
            'kind'                => $r->kind ?? null,
            'sku'                 => $r->sku ?? null,
            'qty'                 => $r->qty ?? 0,
            'yields'              => $r->yields ?? 0,
            'mode'                => $r->mode ?? null,
            'remarks'             => $r->remarks ?? null,
            'inputted_cost'       => $r->inputted_cost ?? 0,
            'cost'                => $r->cost ?? 0,
            'price'               => $r->price ?? 0,
            'base_per_year'       => $r->base_per_year ?? 0,
            'total_cost'          => $r->total_cost ?? 0,
            'cost_cpp'            => $r->cost_cpp ?? 0,
            'total_sell'          => $r->total_sell ?? 0,
            'sell_cpp'            => $r->sell_cpp ?? 0,
            'machine_margin'      => $r->machine_margin ?? 0,
            'machine_margin_total'=> $r->machine_margin_total ?? 0,
        ])->toArray();
    }

    private function normalizeFees($fees): array
    {
        return $fees->map(fn($f) => [
            'id'         => $f->id,
            'client_row_id' => $f->client_row_id ?? null,
            'label'      => $f->label ?? null,
            'category'   => $f->category ?? null,
            'remarks'    => $f->remarks ?? null,
            'cost'       => $f->cost ?? 0,
            'qty'        => $f->qty ?? 0,
            'total'      => $f->total ?? 0,
            'is_machine' => $f->is_machine ?? false,
            'payer'      => $f->payer ?? null,
        ])->toArray();
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
            ->keyBy(fn($u) => (string) $u->id)
            ->map(fn($u) => [
                'id'       => $u->id,
                'name'     => trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')),
                'position' => $u->position ?? '—',
            ]);

        $signatureFor = function ($userId) {
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

        // Normalize project data so the frontend always gets
        // consistent field names regardless of which model was loaded
        $normalizedProject = array_merge($p->toArray(), [
            'items' => $this->normalizeItems($p->items),
            'fees'  => $this->normalizeFees($p->fees),
        ]);

//     dd([
//     'model'       => $modelClass,
//     'items_count' => $p->items->count(),
//     'fees_count'  => $p->fees->count(),
//     'items_raw'   => $p->items->first()?->toArray(),
//     'fees_raw'    => $p->fees->first()?->toArray(),
// ]);

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryPrint', [
            'tab'                => request('tab', 'summary'),
            'storageKey'         => request('storageKey'),
            'autoprint'          => (bool) request('autoprint', false),
            'showDraftWatermark' => $showDraftWatermark,
            'entryProject'       => $normalizedProject,
            'usersById'          => $usersById,
            'route'              => $route,
            'signatures'         => $signatures,
        ]);
    }
}