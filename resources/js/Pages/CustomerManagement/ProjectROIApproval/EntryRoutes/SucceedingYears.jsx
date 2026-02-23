import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import AddComments from '@/Components/roi/Entry/AddComments';
import AddNotes from '@/Components/roi/Entry/AddNotes';
import CompanyInfoSum from '@/Components/roi/Entry/CompanyInfoSum';
import TotalMVP from '@/Components/roi/Entry/TotalMVP';
import InterestCalcuSum from '@/Components/roi/Entry/InterestCalcuSum';
import Names from '@/Components/roi/Entry/Names';
import SucceedingYearsPotential from '@/Components/roi/Entry/SucceedingYear/SuccedingYearsPotential';
import { useProjectData } from '@/Context/ProjectContext';
import MachCon1stY from '@/Components/roi/Entry/Summary1stYear/MachCon1stY';
import Totals from '@/Components/roi/Entry/Summary1stYear/Totals'; // ✅ added

const SucceedingYears = forwardRef(function SucceedingYears(_props, ref) {
  const { projectData } = useProjectData();

  const contractYears = Number(projectData?.companyInfo?.contractYears) || 1;

  const potentialYears = useMemo(() => {
    const count = Math.max(0, contractYears - 1);
    return Array.from({ length: count }, (_, i) => i + 2);
  }, [contractYears]);

  // ✅ Expose methods so Entry footer buttons won't break on Succeeding tab
  useImperativeHandle(ref, () => ({
    reject: () => {
      console.log('[SucceedingYears] reject');
      // TODO: put your real workflow here
    },
    backToSender: () => {
      console.log('[SucceedingYears] backToSender');
      // TODO
    },
    submitToNextLevel: () => {
      console.log('[SucceedingYears] submitToNextLevel');
      // TODO
    },
    approve: () => {
      console.log('[SucceedingYears] approve');
      // TODO
    },
    printPreview: () => {
      console.log('[SucceedingYears] printPreview');
      window.print();
    },
    print: () => {
      console.log('[SucceedingYears] print');
      window.print();
    },
  }));

  return (
    <div className="mx-5 print:mx-0 bg-[#B5EBA2]/5 border rounded-r-lg rounded-b-xl border-t-0 border-b-[#B5EBA2] border-x-[#B5EBA2]">
      <div className="mx-10 print:mx-0 print:pt-0 pt-8">
        <CompanyInfoSum />

        <div className="grid grid-cols-[40%_60%] gap-4 mt-4 items-start print:[grid-template-columns:45%_55%] print:p-1 print:gap-0">
          <div className="max-w-4xl w-full mt-3 print:ml-0 print:mt-0 print:mr-0">
            <TotalMVP />
          </div>

          <div className="mt-1 print:mt-0">
            <InterestCalcuSum />
          </div>
        </div>

        <div className='grid grid-cols-[70%_30%] items-start gap-4 mt-0 print:mx-0 print:gap-0'>
          <div className='flex flex-col gap-2 pt-8 print:pt-7 print:gap-0'>
            {/* MACHINE & CONSUMABLES */}
            <MachCon1stY />
          </div>
          <div>
            <SucceedingYearsPotential />
          </div>
        </div>

        <Totals />

        <div className="grid grid-cols-2 items-center gap-4">
          {/* ✅ Make keys consistent */}
          <AddNotes scopeKey="roi-succeeding-years" />
          <AddComments scopeKey="roi-succeeding-years" />
        </div>

        <Names />
      </div>
    </div>
  );
});

// Simple helper to get "st", "nd", "rd", "th" suffixes
function getOrdinalSuffix(i) {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

export default SucceedingYears;