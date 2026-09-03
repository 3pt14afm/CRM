import React, { useMemo } from 'react';
import { ProjectContext } from '@/Context/ProjectContext';
import CompanyInfoSum from '@/Components/roi/Entry/CompanyInfoSum';
import InterestCalcuSum from '@/Components/roi/Entry/InterestCalcuSum';
import TotalMVP from '@/Components/roi/Entry/TotalMVP';
import MachCon1stYearMerged from '@/Components/roi/Entry/Summary1stYear/MachCon1stYearMerged';
import MachConSucceMerged from '@/Components/roi/Entry/SucceedingYear/MachConSucceMerged';
import SucceTotals from '@/Components/roi/Entry/SucceedingYear/succeTotals';
import ContractDetails from '@/Components/roi/Entry/Summary1stYear/ContractDetails';
import EntryRemarksSummary from '@/Components/roi/Entry/Summary1stYear/EntryRemarksSummary';
import AddComments from '@/Components/roi/Entry/AddComments';
import Names from '@/Components/roi/Entry/Names';
import { useGroupProjectData } from '@/Context/GroupProjectContext';

function sumEntries(entries, key) {
  return entries.reduce((sum, entry) => sum + Number(entry?.totalProjectCost?.[key] || 0), 0);
}

// Warns instead of silently no-op-ing, so an accidental write attempt from a
// "read-only" summary child shows up in the console instead of failing quietly.
// Dev-only: stays quiet in production so a legitimate no-op (expected here by
// design) doesn't look like a live error to end users.
function readOnlyGuard(name) {
  return (...args) => {
    if (import.meta.env.DEV) {
      console.warn(
        `[OverallSummary] "${name}" was called from a per-entry summary block, but this view is read-only. Call ignored.`,
        args
      );
    }
  };
}

// Mirrors GroupProjectContext's own bridgedProjectData merge (companyName /
// companySapCode / type / reference are shared fields that live outside the
// entry itself and only get merged onto the *active* entry by the provider —
// since we render every entry here, not just the active one, we have to
// replicate that merge per entry ourselves.
function buildEntryProjectData(entry, groupData) {
  return {
    ...entry,
    metadata: { ...entry.metadata, ...groupData.metadata },
    companyInfo: {
      ...entry.companyInfo,
      companyName: groupData.companyInfo.companyName,
      companySapCode: groupData.companyInfo.companySapCode,
      type: groupData.companyInfo.type,
      reference: groupData.metadata.reference,
      projectUid: entry.projectUid,
    },
  };
}

// Full bridgedValue shape with every setter stubbed. A partial value here
// (e.g. just { projectData }) would silently break any child that destructures
// updateSection/setMachineConfig/etc. from useProjectData() — even if it's
// only called from a mount effect, not a click.
function buildReadOnlyContextValue(entry, groupData) {
  return {
    projectData: buildEntryProjectData(entry, groupData),
    setProjectData: readOnlyGuard('setProjectData'),
    updateSection: readOnlyGuard('updateSection'),
    setMachineConfig: readOnlyGuard('setMachineConfig'),
    setYield: readOnlyGuard('setYield'),
    setAdditionalFees: readOnlyGuard('setAdditionalFees'),
    setYearlyData: readOnlyGuard('setYearlyData'),
    syncYearlyBreakdown: readOnlyGuard('syncYearlyBreakdown'),
    setContractDetails: readOnlyGuard('setContractDetails'),
    saveDraft: readOnlyGuard('saveDraft'),
    resetProject: readOnlyGuard('resetProject'),
    registerMachineConfigGetter: () => {},
    getCurrentMachineConfig: () => null,
  };
}

// One entry's block, split out so useMemo can stabilize its context value
// across OverallSummary re-renders. MachCon1stYearMerged and ContractDetails
// each call a stubbed setter (updateSection / setContractDetails) from a
// useEffect keyed on that setter's reference — without memoizing here, a new
// stub function on every OverallSummary render would re-fire those effects
// every render (harmless, since the write is discarded either way, but noisy).
function EntrySummaryBlock({ entry, groupData, index, isLast }) {
  const contractYears = Number(entry?.companyInfo?.contractYears ?? 0);
  const showSucceedingYear = contractYears > 1;

  const contextValue = useMemo(
    () => buildReadOnlyContextValue(entry, groupData),
    // entry/groupData.metadata/groupData.companyInfo are the only pieces
    // buildReadOnlyContextValue actually reads.
    [entry, groupData.metadata, groupData.companyInfo]
  );

  return (
    <ProjectContext.Provider value={contextValue}>
      <div className='mt-4 pb-1 border-t border-gray-300 print:border-none print:mt-0'>
        <div className='print-avoid-break'>
          <p className='text-[13px] font-extrabold text-gray-600 uppercase tracking-wider mb-2 pt-5 print:pt-0'>
            Entry {index + 1}
          </p>

          <CompanyInfoSum
            companyInfo={entry.companyInfo}
            fields={['contractType', 'contractTerm', 'purpose']}
            gridColsClass='lg:grid-cols-[1fr_1fr_2fr] print:grid-cols-[1fr_1fr_2fr]'
          />

          <div className='lg:grid lg:grid-cols-[50%_50%] gap-4 mt-4 items-start print:grid print:grid-cols-[45%_55%] print:p-0 print:gap-0'>
            <div className='max-w-4xl w-full mt-3 print:ml-0 print:mt-0 print:mr-0'>
              <TotalMVP />
            </div>
            <div className='mt-1 print:mt-0'>
              <InterestCalcuSum />
            </div>
          </div>
        </div>

        <div className='pt-8 print:mx-0 print:mr-0.5 print:-mt-2 print:pt-7'>
          <MachCon1stYearMerged />
        </div>

        {showSucceedingYear && <div className='print-page-break' />}

        <div>
          {showSucceedingYear && (
            <>
              <div className='mt-1 pt-8 print:mt-0 print:mx-0 print:mr-0.5 print:pt-0'>
                <MachConSucceMerged />
              </div>
              <div className="print:mr-0.5">
                <SucceTotals />
              </div> 
            </>
          )}

          <div className='grid grid-cols-1 lg:grid-cols-[70%_30%] gap-5 items-start print:grid-cols-[70%_30%] print:gap-1 print:items-start'>
            <ContractDetails />
            <EntryRemarksSummary />
          </div>

          <div className='lg:mx-20 print:mx-0 pt-5'>
            <AddComments />
          </div>
        </div>

        {!isLast && <div className='print-page-break' />}
      </div>
    </ProjectContext.Provider>
  );
}

function OverallSummary() {
  const { groupData } = useGroupProjectData();
  const entries = groupData?.entries || [];

  const overallTotals = {
    grandTotalRevenue: sumEntries(entries, 'grandTotalRevenue'),
    grandTotalCost: sumEntries(entries, 'grandTotalCost'),
    grandROI: sumEntries(entries, 'grandROI'),
  };
  overallTotals.grandROIPercentage = overallTotals.grandTotalCost
    ? (overallTotals.grandROI / overallTotals.grandTotalCost) * 100
    : 0;

  // reference lives in groupData.metadata, not groupData.companyInfo —
  // merge it in so CompanyInfoSum's 'reference' field isn't blank.
  const sharedCompanyInfo = {
    ...groupData?.companyInfo,
    reference: groupData?.metadata?.reference,
  };

  return (
    <div className='mx-5 print:mx-0 bg-[#f8f8f8] print:bg-white border rounded-r-lg rounded-b-xl border-t-[#2c2c2e]/10 border-b-[#2c2c2e]/30 border-[#2c2c2e]/20 shadow-md print:shadow-none print:justify-center print:border-none print:bg-transparent'>
      <div className='lg:mx-10 mx-4 print:mx-0 print:pt-0 pt-4'>

        {/* Overall header: shared company info (left) + overall totals (right) */}
        <div className='print-avoid-break lg:grid lg:grid-cols-[65%_35%] gap-8 mt-4 print:mt-0 items-start print:grid print:grid-cols-[55%_45%] print:p-0 print:gap-0 print:pb-4'>
          <CompanyInfoSum
            companyInfo={sharedCompanyInfo}
            fields={['companyName', 'reference', 'type']}
            gridColsClass='lg:grid-cols-[2fr_1fr_1fr] print:grid-cols-[2fr_1fr_1fr]'
          />
          <div className='-mt-2 print:mt-0'>
            <InterestCalcuSum variant='totalsOnly' overrideTotals={overallTotals} />
          </div>
        </div>

        {/* Per-entry sections, in order */}
        {entries.map((entry, index) => (
          <EntrySummaryBlock
            key={entry.projectUid || index}
            entry={entry}
            groupData={groupData}
            index={index}
            isLast={index === entries.length - 1}
          />
        ))}

        <div className="break-inside-avoid print-avoid-break print:break-inside-avoid">
          <Names />
        </div>
      </div>
    </div>
  );
}

export default OverallSummary;