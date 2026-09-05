import { useEffect, useRef, useState } from 'react';
import { useGroupProjectData } from '@/Context/GroupProjectContext';
import { mapEntryProjectToContext } from '@/hooks/roi/useEntryHydration';

/**
 * Group equivalent of useEntryHydration.
 *
 * - No entryProjects prop (or empty array): new-group creation — resets to
 *   a blank single-entry group, same as before.
 * - entryProjects prop present: hydrates an existing saved group for
 *   editing. Each row is mapped via the same mapEntryProjectToContext used
 *   by single-entry (rows are serialized identically), then split into
 *   groupData's shared companyInfo (taken from the master row — first in
 *   the array, since the backend orders by sequence) and one entries[]
 *   slice per row.
 *
 * @param {Array|null} entryProjects - server-side group rows, ordered by sequence
 * @param {string} activeTab
 */
export function useGroupEntryHydration(entryProjects, activeTab, initialActiveEntryIndex = 0) {
  const { resetGroup, hydrateGroup } = useGroupProjectData();

  const [tab, setTab] = useState(() =>
    activeTab === 'Summary' ? 'Summary' :
    activeTab === 'Succeeding' ? 'Succeeding' :
    'Machine'
  );
  const [resetKey, setResetKey] = useState(0);
  const [showCompanyInfoErrors, setShowCompanyInfoErrors] = useState(false);

  const hydratedReferenceRef = useRef(null);
  const hasResetRef = useRef(false);

  const hasExistingGroup = Array.isArray(entryProjects) && entryProjects.length > 0;

  // New-group creation: reset to blank, same as before. Only runs once and
  // only when there's nothing to hydrate.
  useEffect(() => {
    if (hasExistingGroup) return;
    if (hasResetRef.current) return;
    hasResetRef.current = true;
    setShowCompanyInfoErrors(false);
    resetGroup();
    setResetKey((k) => k + 1);
  }, [hasExistingGroup, resetGroup]);

  // Existing group: map every row, split shared vs. per-entry fields, hydrate.
  useEffect(() => {
    if (!hasExistingGroup) return;

    const reference = entryProjects[0]?.reference ?? null;
    const versionSignature = entryProjects.map(p => `${p.id}:${p.version}`).join(',');
    const hydrationKey = `${reference}|${versionSignature}`;
    if (hydratedReferenceRef.current === hydrationKey) return;

    const mappedRows = entryProjects.map(mapEntryProjectToContext);
    const master = mappedRows[0];

    const groupDataShape = {
      metadata: {
        reference: master.companyInfo.reference,
        lastSaved: master.metadata.lastSaved,
        status: master.metadata.status,
      },
      companyInfo: {
        companyName: master.companyInfo.companyName,
        companySapCode: master.companyInfo.companySapCode,
        type: master.companyInfo.type,
      },
      entries: mappedRows.map((row, index) => ({
        metadata: {
          projectId: row.metadata.projectId,
          notes: entryProjects[index]?.notes ?? [],
          comments: entryProjects[index]?.comments ?? [],
        },
        projectUid: row.companyInfo.projectUid,
        companyInfo: {
          contractYears: row.companyInfo.contractYears,
          contractType: row.companyInfo.contractType,
          purpose: row.companyInfo.purpose,
          bundledStdInk: row.companyInfo.bundledStdInk,
        },
        interest: row.interest,
        yield: row.yield,
        entryRemarks: row.entryRemarks,
        machineConfiguration: row.machineConfiguration,
        additionalFees: row.additionalFees,
        yearlyBreakdown: row.yearlyBreakdown,
        totalProjectCost: row.totalProjectCost,
        contractDetails: row.contractDetails,
      })),
    };

    setShowCompanyInfoErrors(false);
    hydrateGroup(groupDataShape, initialActiveEntryIndex);
    hydratedReferenceRef.current = reference;
    setResetKey((k) => k + 1);
  }, [hasExistingGroup, entryProjects, hydrateGroup]);

  return {
    tab,
    setTab,
    resetKey,
    setResetKey,
    showCompanyInfoErrors,
    setShowCompanyInfoErrors,
  };
}