<?php

namespace App\Http\Controllers\Contract;

use App\Http\Controllers\Concerns\AppliesCompanyVisibility;
use App\Http\Controllers\Controller;
use App\Models\Contracts\Contract;
use App\Models\CustomerInfo\Company;
use App\Models\LocationDepartment;
use App\Models\User;
use App\Services\ContractUploadLogger;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ContractController extends Controller
{
    use AppliesCompanyVisibility;

    /**
     * Message shown (and returned to the frontend) when a contract can no
     * longer be extended because it's been expired too long.
     */
    private const EXTENSION_WINDOW_EXPIRED_MESSAGE =
        'This contract expired more than 3 months ago and can no longer be extended.';

    public function upload(Request $request)
    {
        $perPage = $request->integer('per_page', 12);

        if ($perPage < 1) {
            $perPage = 12;
        } elseif ($perPage > 100) {
            $perPage = 100;
        }

        $sortBy    = $request->input('sort_by', 'company_name');
        $sortOrder = $request->input('sort_order', 'asc') === 'desc' ? 'desc' : 'asc';

        $allowedSorts = [
            'id', 'company_name', 'sap_code',
            'client_category', 'delsan_company', 'client_manager', 'contracts_count',
        ];

        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'company_name';
        }

        $numericColumns = ['id'];
        $companyTable   = (new Company())->getTable();

        $qualify = fn (string $table, string $column) =>
            '`' . str_replace('.', '`.`', $table) . '`.`' . $column . '`';

        $baseQuery = Company::query()
            ->leftJoin('users as client_managers', function ($join) use ($companyTable) {
                $join->on(
                    DB::raw("{$companyTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                    '=',
                    DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                );
            })
            ->select("{$companyTable}.*")
            ->with('clientManager')
            ->where("{$companyTable}.status", 1)
            ->when(true, fn ($query) => $this->applyCompanyVisibility($query))
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('company_name', 'like', "%{$search}%")
                      ->orWhere('sap_code', 'like', "%{$search}%")
                      ->orWhere('address', 'like', "%{$search}%")
                      ->orWhere('delsan_company', 'like', "%{$search}%")
                      // Account manager's full name — matches against the
                      // client_managers alias already joined in above, so
                      // e.g. searching "andre" or "jarl aniana" both find
                      // companies managed by "Andre Jarl Aniana".
                      ->orWhereRaw(
                          "LOWER(CONCAT(client_managers.first_name, ' ', client_managers.last_name)) LIKE ?",
                          ['%' . strtolower($search) . '%']
                      );
                });
            })
            ->when($request->input('category'), function ($query, $category) {
                $query->where('client_category', $category);
            })
            ->when($request->input('delsan_company'), function ($query, $delsan) {
                $query->where('delsan_company', $delsan);
            });

        $contractTable = (new Contract())->getTable();

        $qualifyTable = fn (string $table) => '`' . str_replace('.', '`.`', $table) . '`';

        // NOTE: every company row (branch) is now shown individually —
        // no more deduping to one representative row per sap_code group.
        // Clicking a row is unambiguous: it's that exact branch.
        $companies = $baseQuery
            ->when($sortBy === 'sap_code', function ($query) use ($sortOrder) {
                $query->orderByRaw(
                    "CAST(REGEXP_REPLACE(sap_code, '^[A-Za-z-]+', '') AS UNSIGNED) {$sortOrder},
                     sap_code {$sortOrder}"
                );
            })
            ->when($sortBy === 'client_manager', function ($query) use ($sortOrder) {
                $query->orderByRaw(
                    "LOWER(CONCAT(client_managers.first_name, ' ', client_managers.last_name)) {$sortOrder}"
                );
            })
            ->when($sortBy === 'contracts_count', function ($query) use ($sortOrder, $companyTable, $contractTable, $qualifyTable) {
                // Counts this specific branch's own contracts — matched by
                // company_name the same way the contracts_count sent to the
                // frontend is computed below (with an id fallback for
                // companies that have no sap_code at all).
                $query->orderByRaw("
                    (
                        SELECT COUNT(*)
                        FROM {$qualifyTable($contractTable)} AS ct
                        WHERE (ct.company_name COLLATE utf8mb4_unicode_ci) = ({$companyTable}.company_name COLLATE utf8mb4_unicode_ci)
                           OR ({$companyTable}.sap_code IS NULL AND ct.company_id = {$companyTable}.id)
                    ) {$sortOrder}
                ");
            })
            ->when(!in_array($sortBy, ['sap_code', 'client_manager', 'contracts_count']) && in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder, $companyTable) {
                $query->orderBy("{$companyTable}.{$sortBy}", $sortOrder);
            })
            ->when(!in_array($sortBy, ['sap_code', 'client_manager', 'contracts_count']) && !in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder, $companyTable, $qualify) {
                $query->orderByRaw("LOWER({$qualify($companyTable, $sortBy)}) {$sortOrder}");
            })
            ->paginate($perPage)
            ->withQueryString();

        $sapCodesOnPage = $companies->getCollection()->pluck('sap_code')->filter()->unique()->values();

        // Sibling branches can still share upload permission through a
        // common SAP code even though they're no longer merged into one
        // display row — a manager assigned to any branch in the group can
        // upload for every branch in that group.
        $managerIdsBySapCode = Company::query()
            ->select('sap_code', 'id_client_mngr')
            ->where('status', 1)
            ->whereIn('sap_code', $sapCodesOnPage)
            ->get()
            ->groupBy('sap_code')
            ->map(fn ($group) => $group->pluck('id_client_mngr')->filter()->unique()->values());

        $isAdmin           = $this->isAdmin();
        $isPrivileged      = $this->isPrivilegedEmployee();
        $currentEmployeeId = Auth::user()->employee_id ?? null;

        // ── Per-branch contract counts + status color coding ──────────────
        // Same resolution rule as CustomerInfoController: a contract's
        // company_id can be shared across an entire sap_code group (it's
        // whichever branch's id was used at store time), so company_name is
        // the field that actually identifies which specific branch a
        // contract belongs to. Match by company_name first; fall back to
        // company_id only for companies with no sap_code (a true 1:1
        // mapping) — that fallback is unsafe for grouped companies since
        // their id is shared with siblings.
        $companyIdsOnPage   = $companies->getCollection()->pluck('id');
        $companyNamesOnPage = $companies->getCollection()->pluck('company_name')->filter()->unique()->values();

        $contractsForPage = Contract::query()
            ->where(function ($q) use ($companyIdsOnPage, $companyNamesOnPage) {
                $q->whereIn('company_id', $companyIdsOnPage)
                  ->orWhereIn('company_name', $companyNamesOnPage);
            })
            ->get(['id', 'company_id', 'company_name', 'status', 'end_date', 'extend_dates', 'terminated_at', 'archived_at']);

        $contractsForPage->each(fn ($c) => $c->refreshStatus());

        $contractsByCompanyName = $contractsForPage->groupBy('company_name');
        $contractsByCompanyId   = $contractsForPage->groupBy('company_id');

        $contractsForCompany = function ($c) use ($contractsByCompanyName, $contractsByCompanyId) {
            if ($c->company_name && $contractsByCompanyName->has($c->company_name)) {
                return $contractsByCompanyName->get($c->company_name);
            }

            if (!$c->sap_code) {
                return $contractsByCompanyId->get($c->id) ?? collect();
            }

            return collect();
        };

        $statusFromContracts = function ($contracts) {
            // 'expired' -> any contract currently expired
            // 'warning' -> no expired, but at least one expiring soon
            // 'good'    -> active/extended (and no expired or expiring
            //              soon), or none of the above
            return match (true) {
                $contracts->contains(fn ($ct) => $ct->status === Contract::STATUS_EXPIRED) => 'expired',
                $contracts->contains(fn ($ct) => $ct->status === Contract::STATUS_EXPIRING_SOON) => 'warning',
                $contracts->contains(fn ($ct) => in_array($ct->status, [
                    Contract::STATUS_ACTIVE,
                    Contract::STATUS_EXTENDED,
                ], true)) => 'good',
                default => 'good',
            };
        };

        $contractsCountByRowId  = collect();
        $contractsStatusByRowId = collect();

        foreach ($companies->getCollection() as $c) {
            $group = $contractsForCompany($c);
            $contractsCountByRowId[$c->id]  = $group->count();
            $contractsStatusByRowId[$c->id] = $statusFromContracts($group);
        }

        $companies->getCollection()->transform(function ($c) use (
            $managerIdsBySapCode,
            $contractsCountByRowId,
            $contractsStatusByRowId,
            $isAdmin,
            $isPrivileged,
            $currentEmployeeId
        ) {
            $isDirectManager = $currentEmployeeId
                && (string) $c->id_client_mngr === (string) $currentEmployeeId;

            $isGroupManager = $currentEmployeeId && $c->sap_code
                && ($managerIdsBySapCode[$c->sap_code] ?? collect())
                    ->contains(fn ($id) => (string) $id === (string) $currentEmployeeId);

            return [
                'id'                    => $c->id,
                'company_name'          => $c->company_name,
                'sap_code'              => $c->sap_code,
                'client_category'       => $c->client_category,
                'delsan_company'        => $c->delsan_company,
                'id_client_mngr'        => $c->id_client_mngr,
                'client_manager'        => $c->clientManager ? $c->clientManager->first_name . ' ' . $c->clientManager->last_name : null,
                'can_upload'            => $isAdmin || $isPrivileged || $isDirectManager || $isGroupManager,
                'contracts_count'       => $contractsCountByRowId[$c->id] ?? 0,
                'contracts_status'      => $contractsStatusByRowId[$c->id] ?? 'good',
            ];
        });

        $categories = Company::query()
            ->where('status', 1)
            ->whereNotNull('client_category')
            ->where('client_category', '!=', '')
            ->distinct()
            ->orderBy('client_category')
            ->pluck('client_category');

        if (!$request->header('X-Inertia') && ($request->ajax() || $request->wantsJson())) {
            return response()->json([
                'companies' => $companies,
            ]);
        }

        return Inertia::render('Contract/UploadContract', [
            'companies'  => $companies,
            'categories' => $categories,
            'is_admin'   => $isAdmin,
            'filters'    => $request->only([
                'search', 'category', 'per_page', 'sort_by', 'sort_order', 'delsan_company',
            ]),
        ]);
    }

    public function contracts($companyId)
    {
        $company = Company::findOrFail($companyId);

        // Admin, Assigned Manager, Approver, or Privileged Employee can VIEW
        if (!$this->canAccessCompanyContracts($company)) {
            abort(403, 'You are not authorized to view contracts for this company.');
        }

        // Scoped to this exact branch, not every sibling sharing its SAP
        // code — the row the user clicked already tells us which branch
        // they mean, so there's no group to disambiguate anymore. Matched
        // by company_name first (contracts across a sap_code group can
        // share a company_id, since it's whichever branch's id was used at
        // store time — see the note in CustomerInfoController), falling
        // back to company_id only for companies with no sap_code at all.
        $contractsRaw = Contract::query()
            ->where(function ($q) use ($company) {
                $q->where('company_name', $company->company_name);

                if (!$company->sap_code) {
                    $q->orWhere('company_id', $company->id);
                }
            })
            ->orderByDesc('start_date')
            ->get();

        // Single flag for the whole list — every contract returned belongs
        // to this one branch, so there's no per-row group to vary by.
        $canManage = $this->canManageCompanyContracts($company);

        // Every distinct employee_id we might need to display a name for —
        // everyone who ever extended, terminated, or archived one of these
        // contracts — resolved once in a single query rather than
        // per-contract.
        $extendedByIds = $contractsRaw
            ->flatMap(fn ($c) => collect($c->extend_dates ?? [])->pluck('extended_by'));

        $employeeIdsToResolve = $extendedByIds
            ->merge($contractsRaw->pluck('terminated_by'))
            ->merge($contractsRaw->pluck('archived_by'))
            ->filter()
            ->unique()
            ->values();

        $employeeNamesById = User::query()
            ->whereIn('employee_id', $employeeIdsToResolve)
            ->get(['employee_id', 'first_name', 'last_name'])
            ->keyBy('employee_id')
            ->map(fn ($u) => trim("{$u->first_name} {$u->last_name}"));

        $contracts = $contractsRaw
            ->map(function ($c) use ($canManage, $employeeNamesById) {
                // No-ops (and never overwrites the status) once a contract
                // is terminated/archived — see Contract::refreshStatus().
                $c->refreshStatus();

                $isFinal = $c->isFinal();

                // Once a contract has been expired for 3+ months (measured
                // from its latest effective end date — the most recent
                // extension if any, otherwise the original end_date) it can
                // no longer be extended, even by someone who otherwise has
                // permission to manage it.
                $extensionWindowExpired = $this->isPastExtensionWindow($c);

                return [
                    'id'                 => $c->id,
                    'doc_num'            => $c->doc_num,
                    'company_name'       => $c->company_name,
                    'start_date'         => optional($c->start_date)->format('Y-m-d'),
                    'end_date'           => optional($c->end_date)->format('Y-m-d'),
                    'extend_dates'       => collect($c->extend_dates ?? [])
                        ->map(function ($entry) use ($employeeNamesById) {
                            $entry['extended_by_name'] = $employeeNamesById[$entry['extended_by'] ?? null] ?? null;
                            return $entry;
                        })
                        ->all(),
                    'status'             => $c->status,
                    // Permission AND not a final state (terminated/archived
                    // contracts can only ever be viewed again). Used to
                    // decide whether the edit button / 3-dot menu shows up
                    // at all.
                    'can_edit'           => $canManage && !$isFinal,
                    // Permission, not final, AND still within the 3-month
                    // extension window. Used to decide whether an extend
                    // attempt is actually allowed to succeed.
                    'can_extend'         => $canManage && !$isFinal && !$extensionWindowExpired,
                    // Lets the frontend distinguish *why* extension isn't
                    // allowed (no permission vs. window has closed) so it
                    // can show the right message.
                    'extension_expired'  => $extensionWindowExpired,
                    // Employee can terminate/cancel a contract that's still
                    // "live" in some sense — active, extended, or expiring
                    // soon. Not offered once it's already expired (that's
                    // what archiving is for) or already final.
                    'can_terminate'      => $canManage && in_array($c->status, [
                        Contract::STATUS_ACTIVE,
                        Contract::STATUS_EXTENDED,
                        Contract::STATUS_EXPIRING_SOON,
                    ], true),
                    // Employee can archive only once a contract has expired.
                    'can_archive'        => $canManage && $c->status === Contract::STATUS_EXPIRED,
                    'terminated_at'      => optional($c->terminated_at)->format('Y-m-d'),
                    'terminated_by'      => $c->terminated_by,
                    'terminated_by_name' => $employeeNamesById[$c->terminated_by] ?? null,
                    'archived_at'        => optional($c->archived_at)->format('Y-m-d'),
                    'archived_by'        => $c->archived_by,
                    'archived_by_name'   => $employeeNamesById[$c->archived_by] ?? null,
                    'pdf_url'            => $c->pdf_path ? route('contract.pdf', $c->id) : null,
                ];
            });

        return response()->json([
            'sap_code'     => $company->sap_code,
            'company_name' => $company->company_name,
            'contracts'    => $contracts,
        ]);
    }

    public function store(Request $request, $companyId)
    {
        $company = Company::findOrFail($companyId);

        // Admin, Privileged Employee, or Assigned Manager (including sibling
        // branches under the same SAP code) can UPLOAD — Approvers cannot.
        if (!$this->canManageCompanyContracts($company)) {
            abort(403, 'You are not authorized to upload a contract for this company.');
        }

        $employeeId = Auth::user()->employee_id ?? null;

        $validated = $request->validate([
            'pdf'        => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:10240'],
            'doc_num'    => ['required', 'string', 'max:100', Rule::unique('contracts', 'doc_num')],
            'start_date' => ['required', 'date'],
            'end_date'   => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        $path = $request->file('pdf')->store('contracts', 'local');

        try {
            $contract = DB::transaction(function () use ($company, $validated, $path, $employeeId) {
                return Contract::create([
                    'company_id'   => $company->id,
                    // Always this exact branch's own name now — the row the
                    // user clicked already identifies which branch, so
                    // there's no dropdown to pick a sibling from anymore.
                    'company_name' => $company->company_name,
                    'doc_num'      => $validated['doc_num'],
                    'start_date'   => $validated['start_date'],
                    'end_date'     => $validated['end_date'],
                    'pdf_path'     => $path,
                    'uploader'     => $employeeId,
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Clean up the orphaned file since the DB write didn't take.
            Storage::disk('local')->delete($path);

            // MySQL duplicate-entry error code (use 23505 / SQLSTATE check on Postgres).
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                ContractUploadLogger::uploadFailed(
                    $company->company_name,
                    $validated['doc_num'] ?? null,
                    'Duplicate document number.'
                );

                return back()
                    ->withErrors(['doc_num' => 'This document number was just taken by another upload. Please use a different one.'])
                    ->withInput();
            }

            ContractUploadLogger::uploadFailed(
                $company->company_name,
                $validated['doc_num'] ?? null,
                $e->getMessage()
            );

            throw $e;
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);

            ContractUploadLogger::uploadFailed(
                $company->company_name,
                $validated['doc_num'] ?? null,
                $e->getMessage()
            );

            throw $e;
        }

        ContractUploadLogger::uploaded($contract);

        return back()->with('success', 'Contract uploaded successfully.');
    }

    public function update(Request $request, $contractId)
    {
        $contract = Contract::findOrFail($contractId);
        $company  = Company::findOrFail($contract->company_id);

        // Admin, Privileged Employee, or Assigned Manager (including sibling
        // branches under the same SAP code) can EDIT — Approvers cannot.
        // Same rule as store/extend.
        if (!$this->canManageCompanyContracts($company)) {
            abort(403, 'You are not authorized to edit this contract.');
        }

        // A terminated or archived contract is in a final state — nobody,
        // including admins/managers, can edit it anymore. It can only be
        // viewed from this point on.
        if ($contract->isFinal()) {
            abort(403, "This contract has been {$contract->status} and can no longer be edited.");
        }

        $validated = $request->validate([
            // The PDF is optional on edit — omit it to keep the file already
            // on record and only change the other fields.
            'pdf'        => ['nullable', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:10240'],
            'doc_num'    => ['required', 'string', 'max:100', Rule::unique('contracts', 'doc_num')->ignore($contract->id)],
            'start_date' => ['required', 'date'],
            'end_date'   => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        // Snapshot pre-edit values before they get overwritten, so the log can
        // show what actually changed (and whether the PDF file was replaced).
        // company_name is no longer editable — a contract's branch never
        // changes after upload — so it isn't part of the diff.
        $before = [
            'doc_num'    => $contract->doc_num,
            'start_date' => optional($contract->start_date)->format('Y-m-d'),
            'end_date'   => optional($contract->end_date)->format('Y-m-d'),
            'pdf_path'   => $contract->pdf_path,
        ];

        $newPath = null;

        if ($request->hasFile('pdf')) {
            $newPath = $request->file('pdf')->store('contracts', 'local');
        }

        try {
            DB::transaction(function () use ($contract, $validated, $newPath) {
                $contract->update([
                    'doc_num'    => $validated['doc_num'],
                    'start_date' => $validated['start_date'],
                    'end_date'   => $validated['end_date'],
                    'pdf_path'   => $newPath ?? $contract->pdf_path,
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Clean up the newly-uploaded file since the DB write didn't take.
            if ($newPath) {
                Storage::disk('local')->delete($newPath);
            }

            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                ContractUploadLogger::editFailed(
                    $contract,
                    $validated['doc_num'] ?? null,
                    'Duplicate document number.'
                );

                return back()
                    ->withErrors(['doc_num' => 'This document number is already in use. Please use a different one.'])
                    ->withInput();
            }

            ContractUploadLogger::editFailed(
                $contract,
                $validated['doc_num'] ?? null,
                $e->getMessage()
            );

            throw $e;
        } catch (\Throwable $e) {
            if ($newPath) {
                Storage::disk('local')->delete($newPath);
            }

            ContractUploadLogger::editFailed(
                $contract,
                $validated['doc_num'] ?? null,
                $e->getMessage()
            );

            throw $e;
        }

        // Intentionally NOT deleting $oldPath here. Old contract PDFs are
        // kept on disk (even after being replaced) so a prior version can
        // still be retrieved during an audit. Only the *current* pdf_path is
        // linked from the contract record; superseded files just become
        // orphaned-but-recoverable on disk. If disk usage ever becomes a
        // concern, archive/move old files elsewhere rather than deleting.

        ContractUploadLogger::edited($contract, $before, [
            'company_name' => $validated['company_name'],
            'doc_num'      => $validated['doc_num'],
            'start_date'   => $validated['start_date'],
            'end_date'     => $validated['end_date'],
            'pdf_path'     => $contract->pdf_path,
        ]);

        return back()->with('success', 'Contract updated successfully.');
    }

    public function extendDate(Request $request, $contractId)
    {
        $contract = Contract::findOrFail($contractId);
        $company  = Company::findOrFail($contract->company_id);

        // Admin, Privileged Employee, or Assigned Manager (including sibling
        // branches under the same SAP code) can EXTEND — Approvers cannot.
        if (!$this->canManageCompanyContracts($company)) {
            abort(403, 'You are not authorized to extend this contract.');
        }

        // A terminated or archived contract is in a final state and can
        // never be extended again.
        if ($contract->isFinal()) {
            abort(403, "This contract has been {$contract->status} and can no longer be extended.");
        }

        // Hard server-side block: a contract that's been expired 3+ months
        // (measured from its latest effective end date to today) can never
        // be extended, regardless of what the frontend sent.
        if ($this->isPastExtensionWindow($contract)) {
            abort(403, self::EXTENSION_WINDOW_EXPIRED_MESSAGE);
        }

        $employeeId = Auth::user()->employee_id ?? null;

        $currentEffectiveEnd = $contract->latestExtendedDate()
            ?? optional($contract->end_date)->format('Y-m-d');

        $validated = $request->validate([
            'extended_end_date' => array_filter([
                'required',
                'date',
                $currentEffectiveEnd ? "after:{$currentEffectiveEnd}" : null,
            ]),
        ]);

        $extendDates   = $contract->extend_dates ?? [];
        $extendDates[] = [
            'date'        => $validated['extended_end_date'],
            'extended_at' => now()->toDateTimeString(),
            'extended_by' => $employeeId,
        ];

        $contract->extend_dates = $extendDates;
        $contract->save();

        ContractUploadLogger::extended($contract, $currentEffectiveEnd, $validated['extended_end_date']);

        // Attach the current user's display name to the entry we just
        // added so the modal can show "Extended by Andre Jarl Aniana"
        // immediately, without waiting on a refetch of the contract list.
        $currentUser     = Auth::user();
        $currentUserName = $currentUser ? trim("{$currentUser->first_name} {$currentUser->last_name}") : null;

        $extendDatesWithNames = collect($contract->extend_dates)
            ->map(function ($entry) use ($employeeId, $currentUserName) {
                if (($entry['extended_by'] ?? null) === $employeeId) {
                    $entry['extended_by_name'] = $currentUserName;
                }
                return $entry;
            })
            ->all();

        // Recompute the action-menu flags from the contract's *new* status
        // (e.g. an expired contract that just got extended is now
        // "extended", not "expired" anymore) so the frontend can swap the
        // 3-dot menu from Archive to Terminate immediately, without
        // waiting on a refetch of the whole contract list.
        $isFinal                = $contract->isFinal();
        $extensionWindowExpired = $this->isPastExtensionWindow($contract);

        return response()->json([
            'id'                => $contract->id,
            'extend_dates'      => $extendDatesWithNames,
            'status'            => $contract->status,
            'can_edit'          => !$isFinal,
            'can_extend'        => !$isFinal && !$extensionWindowExpired,
            'extension_expired' => $extensionWindowExpired,
            'can_terminate'     => in_array($contract->status, [
                Contract::STATUS_ACTIVE,
                Contract::STATUS_EXTENDED,
                Contract::STATUS_EXPIRING_SOON,
            ], true),
            'can_archive'       => $contract->status === Contract::STATUS_EXPIRED,
        ]);
    }

    /**
     * Employee-initiated cancellation/termination of a contract. Only
     * allowed while the contract is still "live" — active, extended, or
     * expiring soon. Once terminated, the contract is final: it can no
     * longer be edited, extended, terminated again, or archived — only
     * viewed.
     */
    public function terminate($contractId)
    {
        $contract = Contract::findOrFail($contractId);
        $company  = Company::findOrFail($contract->company_id);

        // Same permission tier as edit/extend/upload — Approvers cannot
        // terminate a contract, only Admin, Privileged Employee, or the
        // assigned manager.
        if (!$this->canManageCompanyContracts($company)) {
            abort(403, 'You are not authorized to terminate this contract.');
        }

        // Make sure status reflects reality before we check it (e.g. a
        // contract that quietly crossed into "expired" since it was last
        // loaded). No-ops if already final.
        $contract->refreshStatus();

        if ($contract->isFinal()) {
            abort(403, "This contract has already been {$contract->status} and cannot be terminated.");
        }

        if (!in_array($contract->status, [
            Contract::STATUS_ACTIVE,
            Contract::STATUS_EXTENDED,
            Contract::STATUS_EXPIRING_SOON,
        ], true)) {
            abort(403, 'Only active, extended, or expiring-soon contracts can be terminated. Expired contracts should be archived instead.');
        }

        $employeeId     = Auth::user()->employee_id ?? null;
        $previousStatus = $contract->status;

        $contract->terminate($employeeId);

        ContractUploadLogger::terminated($contract, $previousStatus);

        $currentUser = Auth::user();

        return response()->json([
            'id'                 => $contract->id,
            'status'             => $contract->status,
            'terminated_at'      => optional($contract->terminated_at)->format('Y-m-d'),
            'terminated_by_name' => $currentUser ? trim("{$currentUser->first_name} {$currentUser->last_name}") : null,
        ]);
    }

    /**
     * Employee-initiated archiving of an already-expired contract. Once
     * archived, the contract is final: it can no longer be edited,
     * extended, terminated, or archived again — only viewed.
     */
    public function archive($contractId)
    {
        $contract = Contract::findOrFail($contractId);
        $company  = Company::findOrFail($contract->company_id);

        // Same permission tier as edit/extend/upload — Approvers cannot
        // archive a contract, only Admin, Privileged Employee, or the
        // assigned manager.
        if (!$this->canManageCompanyContracts($company)) {
            abort(403, 'You are not authorized to archive this contract.');
        }

        $contract->refreshStatus();

        if ($contract->isFinal()) {
            abort(403, "This contract has already been {$contract->status}.");
        }

        if ($contract->status !== Contract::STATUS_EXPIRED) {
            abort(403, 'Only expired contracts can be archived.');
        }

        $employeeId = Auth::user()->employee_id ?? null;

        $contract->archive($employeeId);

        ContractUploadLogger::archived($contract);

        $currentUser = Auth::user();

        return response()->json([
            'id'               => $contract->id,
            'status'           => $contract->status,
            'archived_at'      => optional($contract->archived_at)->format('Y-m-d'),
            'archived_by_name' => $currentUser ? trim("{$currentUser->first_name} {$currentUser->last_name}") : null,
        ]);
    }

    private function visibleCompanyIds()
    {
        $employeeId = Auth::user()->employee_id ?? null;

        if ($this->isAdmin() || $this->isPrivilegedEmployee() || $employeeId === '0283') {
            return Company::query()->where('status', 1)->pluck('id');
        }

        $companyTable = (new Company())->getTable();

        $query = Company::query()
            ->leftJoin('users as client_managers', function ($join) use ($companyTable) {
                $join->on(
                    DB::raw("{$companyTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                    '=',
                    DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                );
            })
            ->where("{$companyTable}.status", 1) 
            ->select("{$companyTable}.id");

        $this->applyCompanyVisibility($query);

        return $query->pluck('id');
    }

    public function statusStats(Request $request)
    {
        $counts = ['expiring_soon' => 0, 'active' => 0, 'expired' => 0];

        $visibleCompanyIds = $this->visibleCompanyIds();

        Contract::query()
            ->whereIn('company_id', $visibleCompanyIds)
            ->chunk(200, function ($contracts) use (&$counts) {
                foreach ($contracts as $contract) {
                    $contract->refreshStatus();

                    $bucket = $contract->status === Contract::STATUS_EXTENDED
                        ? Contract::STATUS_ACTIVE
                        : $contract->status;

                    if (isset($counts[$bucket])) {
                        $counts[$bucket]++;
                    }
                }
            });

        return response()->json($counts);
    }

    public function byStatus(Request $request)
    {
        $status = $request->input('status', 'expiring_soon');

        if (!in_array($status, ['expiring_soon', 'active', 'expired'])) {
            $status = 'expiring_soon';
        }

        $limit = 50;

        $visibleCompanyIds = $this->visibleCompanyIds();

        $contracts = Contract::query()
            ->whereIn('company_id', $visibleCompanyIds)
            ->get();

        $filtered = $contracts
            ->each(fn ($c) => $c->refreshStatus())
            ->filter(function ($c) use ($status) {
                // Same "extended folds into active" rollup as statusStats().
                if ($status === Contract::STATUS_ACTIVE) {
                    return in_array($c->status, [Contract::STATUS_ACTIVE, Contract::STATUS_EXTENDED], true);
                }
                return $c->status === $status;
            })
            ->map(function ($c) {
                $effectiveDate = $c->latestExtendedDate() ?? optional($c->end_date)->format('Y-m-d');
                $company = Company::find($c->company_id);

                return [
                    'id'             => $c->id,
                    'company_id'     => $c->company_id,
                    'company_name'   => $c->company_name,
                    'sap_code'       => $company->sap_code ?? null,
                    'expires_at'     => $effectiveDate,
                    'days_remaining' => $effectiveDate
                        ? (int) now()->startOfDay()->diffInDays(\Carbon\Carbon::parse($effectiveDate)->startOfDay(), false)
                        : null,
                    'was_extended'   => !empty($c->extend_dates),
                    'can_upload'     => $company ? $this->canManageCompanyContracts($company) : false,
                    'pdf_url' => $c->pdf_path ? route('contract.pdf', $c->id) : null,
                ];
            });

        $sorted = $status === 'expired'
            ? $filtered->sortByDesc('expires_at')
            : $filtered->sortBy('expires_at');

        return response()->json($sorted->take($limit)->values());
    }

    public function viewPdf($contractId)
    {
        $contract = Contract::findOrFail($contractId);
        $company  = Company::find($contract->company_id);

        // Admin, Assigned Manager, Approver, or Privileged Employee can VIEW PDF
        if (!$company || !$this->canAccessCompanyContracts($company)) {
            abort(403, 'You are not authorized to view this contract.');
        }

        if (!$contract->pdf_path) {
            abort(404, 'No PDF path specified.');
        }

        if (!Storage::disk('local')->exists($contract->pdf_path)) {
            abort(404, 'File not found on disk.');
        }

        ContractUploadLogger::viewedPdf($contract);

        return response()->file(
            Storage::disk('local')->path($contract->pdf_path),
            ['Content-Type' => 'application/pdf']
        );
    }

    /**
     * True if the logged-in user is the system admin (user id 1).
     */
    private function isAdmin(): bool
    {
        $currentUser = Auth::user();
        return $currentUser && (int) $currentUser->id === 1;
    }

    /**
     * True if the logged-in user is an approver for the company's assigned
     * client manager's location and department.
     */
    private function isApproverForCompany(Company $company): bool
    {
        $currentUser = Auth::user();
        if (!$currentUser) return false;

        $clientManager = User::where('employee_id', $company->id_client_mngr)->first();
        if (!$clientManager) return false;

        return LocationDepartment::query()
            ->where(function ($q) use ($currentUser) {
                $q->where('reviewed_by', $currentUser->id)
                  ->orWhere('checked_by', $currentUser->id)
                  ->orWhere('endorsed_by', $currentUser->id)
                  ->orWhere('confirmed_by', $currentUser->id)
                  ->orWhere('approved_by', $currentUser->id);
            })
            ->where('location_id', $clientManager->primary_location_id)
            ->where('department_id', $clientManager->department_id)
            ->exists();
    }

    /**
     * True if the logged-in user's employee ID is in the privileged list
     * (config/access.php) — grants admin-equivalent access to all
     * companies' contracts (view + manage), regardless of assignment.
     */
    private function isPrivilegedEmployee(): bool
    {
        $employeeId = Auth::user()->employee_id ?? null;

        return $employeeId !== null
            && in_array((string) $employeeId, config('access.privileged_employee_ids', []), true);
    }

    /**
     * VIEW access: Admin, Assigned Manager, Approver, or Privileged Employee.
     */
    private function canAccessCompanyContracts(Company $company): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        if ($this->isPrivilegedEmployee()) {
            return true;
        }

        $employeeId = Auth::user()->employee_id ?? null;

        if ((string) $company->id_client_mngr === (string) $employeeId) {
            return true;
        }

        return $this->isApproverForCompany($company);
    }

    /**
     * UPLOAD / EXTEND access: Admin, Privileged Employee, or the manager
     * assigned to this company's own row, or the manager assigned to any
     * sibling branch sharing the same SAP code. Approvers are deliberately
     * excluded here — they can view contracts but never upload or extend
     * them.
     */
    private function canManageCompanyContracts(Company $company): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        if ($this->isPrivilegedEmployee()) {
            return true;
        }

        $employeeId = Auth::user()->employee_id ?? null;
        if (!$employeeId) {
            return false;
        }

        if ((string) $company->id_client_mngr === (string) $employeeId) {
            return true;
        }

        if ($company->sap_code) {
            return Company::query()
                ->where('status', 1)
                ->where('sap_code', $company->sap_code)
                ->where('id_client_mngr', $employeeId)
                ->exists();
        }

        return false;
    }

    /**
     * True if the contract's effective end date — the latest recorded
     * extension if any, otherwise its original end_date — is 3 or more
     * months before today. The "interval" is computed directly between the
     * expiry date and the current date, so it correctly accounts for
     * variable month lengths (e.g. Jan 31 -> Apr 30 is still 3 months).
     * Once true, the contract can no longer be extended.
     */
    private function isPastExtensionWindow(Contract $contract): bool
    {
        $effectiveEnd = $contract->latestExtendedDate()
            ?? optional($contract->end_date)->format('Y-m-d');

        if (!$effectiveEnd) {
            return false;
        }

        return Carbon::parse($effectiveEnd)->diffInMonths(now(), false) >= 3;
    }
}