export function mapProjectToContext(p) {
  const items = p?.items ?? [];
  const fees = p?.fees ?? [];

  const mapItem = (r) => ({
    id: r.client_row_id || String(r.id),
    type: r.kind === "machine" ? "machine" : "consumable",
    sku: r.sku ?? "",
    qty: Number(r.qty ?? 0),
    yields: Number(r.yields ?? 0),
    mode: r.mode ?? "",
    remarks: r.remarks ?? "",
    inputtedCost: Number(r.inputted_cost ?? 0),
    cost: Number(r.cost ?? 0),
    price: Number(r.price ?? 0),
    basePerYear: Number(r.base_per_year ?? 0),
    totalCost: Number(r.total_cost ?? 0),
    costCpp: Number(r.cost_cpp ?? 0),
    totalSell: Number(r.total_sell ?? 0),
    sellCpp: Number(r.sell_cpp ?? 0),
    machineMargin: Number(r.machine_margin ?? 0),
    machineMarginTotal: Number(r.machine_margin_total ?? 0),
  });

  const machine = items.filter((r) => r.kind === "machine").map(mapItem);
  const consumable = items.filter((r) => r.kind === "consumable").map(mapItem);

  const mapFee = (f) => ({
    id: f.client_row_id || String(f.id),
    label: f.label ?? "",
    category: f.category ?? "",
    remarks: f.remarks ?? "",
    cost: Number(f.cost ?? 0),
    qty: Number(f.qty ?? 0),
    total: Number(f.total ?? 0),
    isMachine: Boolean(f.is_machine),
  });

  const companyFees = fees.filter((f) => f.payer === "company").map(mapFee);
  const customerFees = fees.filter((f) => f.payer === "customer").map(mapFee);

  const feesTotal =
    companyFees.reduce((s, r) => s + (r.total || 0), 0) +
    customerFees.reduce((s, r) => s + (r.total || 0), 0);

  return {
    metadata: {
      projectId: p?.id ?? null,
      lastSaved: p?.last_saved_at ?? null,
      version: p?.version ?? 1,
      status: p?.status ?? "draft",
      comments: p?.comments ?? [],
      notes: p?.notes ?? [],
      signatories: {
        preparedBy: p?.user?.name ?? (p?.user ? `${p.user.first_name ?? ''} ${p.user.last_name ?? ''}`.trim() : ''),
        preparedByPosition: p?.user?.position ?? '',

        reviewedBy: p?.reviewed_by_user?.name ?? `${p?.reviewed_by_user?.first_name ?? ''} ${p?.reviewed_by_user?.last_name ?? ''}`.trim(),
        reviewedByPosition: p?.reviewed_by_user?.position ?? '',

        checkedBy: p?.checked_by_user?.name ?? `${p?.checked_by_user?.first_name ?? ''} ${p?.checked_by_user?.last_name ?? ''}`.trim(),
        checkedByPosition: p?.checked_by_user?.position ?? '',

        endorsedBy: p?.endorsed_by_user?.name ?? `${p?.endorsed_by_user?.first_name ?? ''} ${p?.endorsed_by_user?.last_name ?? ''}`.trim(),
        endorsedByPosition: p?.endorsed_by_user?.position ?? '',

        confirmedBy: p?.confirmed_by_user?.name ?? `${p?.confirmed_by_user?.first_name ?? ''} ${p?.confirmed_by_user?.last_name ?? ''}`.trim(),
        confirmedByPosition: p?.confirmed_by_user?.position ?? '',

        approvedBy: p?.approved_by_user?.name ?? `${p?.approved_by_user?.first_name ?? ''} ${p?.approved_by_user?.last_name ?? ''}`.trim(),
        approvedByPosition: p?.approved_by_user?.position ?? '',

        rejectedBy: p?.rejected_by_user?.name ?? `${p?.rejected_by_user?.first_name ?? ''} ${p?.rejected_by_user?.last_name ?? ''}`.trim(),
        rejectedByPosition: p?.rejected_by_user?.position ?? '',
      },
      isPrintPreview: true,
      readOnly: true,
    },

    companyInfo: {
      companyName: p?.company_name ?? "",
      contractYears: Number(p?.contract_years ?? 0),
      companySapCode: p?.company_sap_code ?? "",
      contractType: p?.contract_type ?? "",
      reference: p?.reference ?? "",
      purpose: p?.purpose ?? "",
      bundledStdInk: Boolean(p?.bundled_std_ink ?? false),
      type: Number(p?.type ?? 0),
    },

    interest: {
      annualInterest: Number(p?.annual_interest ?? 0),
      percentMargin: Number(p?.percent_margin ?? 0),
    },

    yield: {
      monoAmvpYields: {
        monthly: Number(p?.mono_yield_monthly ?? 0),
        annual: Number(p?.mono_yield_annual ?? 0),
      },
      colorAmvpYields: {
        monthly: Number(p?.color_yield_monthly ?? 0),
        annual: Number(p?.color_yield_annual ?? 0),
      },
    },

    machineConfiguration: {
      machine,
      consumable,
      totals: {
        unitCost: Number(p?.mc_unit_cost ?? 0),
        qty: Number(p?.mc_qty ?? 0),
        totalCost: Number(p?.mc_total_cost ?? 0),
        yields: Number(p?.mc_yields ?? 0),
        costCpp: Number(p?.mc_cost_cpp ?? 0),
        sellingPrice: Number(p?.mc_selling_price ?? 0),
        totalSell: Number(p?.mc_total_sell ?? 0),
        sellCpp: Number(p?.mc_sell_cpp ?? 0),
        totalBundledPrice: Number(p?.mc_total_bundled_price ?? 0),
      },
    },

    additionalFees: {
      company: companyFees,
      customer: customerFees,
      total: Number(p?.fees_total ?? feesTotal),
    },

    yearlyBreakdown: Object.fromEntries(
      Object.entries(p?.yearly_breakdown ?? {}).map(([k, v]) => {
        const num = parseInt(k.replace('year_', ''), 10);
        return [
          num,
          {
            ...v,
            fistYearTotalCost: v.fistYearTotalCost ?? v.firstYearTotalCost ?? 0,
            fistYearTotalSell: v.fistYearTotalSell ?? v.firstYearTotalSell ?? 0,
            firstYearTotalCost: v.firstYearTotalCost ?? v.fistYearTotalCost ?? 0,
            firstYearTotalSell: v.firstYearTotalSell ?? v.fistYearTotalSell ?? 0,
          }
        ];
      })
    ),

    totalProjectCost: {
      grandTotalCost: Number(p?.grand_total_cost ?? 0),
      grandTotalRevenue: Number(p?.grand_total_revenue ?? 0),
      grandROI: Number(p?.grand_roi ?? 0),
      grandROIPercentage: Number(p?.grand_roi_percentage ?? 0),
    },

    contractDetails: {
      machine: [],
      consumable: [],
      totalInitial: 0,
    },

    entryRemarks: {
      remarks: p?.entry_remarks ?? "",
      attachments: Array.isArray(p?.entry_remarks_attachments)
        ? p.entry_remarks_attachments
        : [],
    },
  };
}

// Maps a full sibling set (already ordered by sequence, master first) into
// the exact groupData shape GroupProjectContext's defaultGroupState()/
// hydrateGroup() expect: { metadata: {reference, lastSaved, status},
// companyInfo: {companyName, companySapCode, type}, entries: [...] }.
// Shared/group-level fields are read off the master row only, matching the
// field-scoping rules the rest of multi-entry follows (company_name,
// company_sap_code, type are shared; everything else is per-entry).
export function mapGroupProjectToContext(entryProjects) {
  const list = entryProjects ?? [];
  const master = list[0] ?? null;

  const entries = list.map((p) => ({
    ...mapProjectToContext(p),
    // project_uid ties an entry to its client-side row across draft saves;
    // fall back to the DB id if the column isn't present on this record.
    projectUid: p?.project_uid ?? (p?.id != null ? String(p.id) : ''),
  }));

  return {
    metadata: {
      reference: master?.reference ?? '',
      lastSaved: master?.last_saved_at ?? null,
      status: master?.status ?? 'draft',
    },
    companyInfo: {
      companyName: master?.company_name ?? '',
      companySapCode: master?.company_sap_code ?? '',
      type: Number(master?.type ?? 0),
    },
    entries,
  };
}