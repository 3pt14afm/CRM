import AddComments from '@/Components/roi/Entry/AddComments';
import AddNotes from '@/Components/roi/Entry/AddNotes';
import CompanyInfoSum from '@/Components/roi/Entry/CompanyInfoSum';
import ContractDetails from '@/Components/roi/Entry/Summary1stYear/ContractDetails';
import InterestCalcuSum from '@/Components/roi/Entry/InterestCalcuSum';
import MachCon1stY from '@/Components/roi/Entry/Summary1stYear/MachCon1stY';
import Names from '@/Components/roi/Entry/Names';
import TotalMVP from '@/Components/roi/Entry/TotalMVP';
import Totals from '@/Components/roi/Entry/Summary1stYear/Totals';
import React from 'react';
import Potentials from '@/Components/roi/Entry/Potentials';
import SucceedingYearsPotential from '@/Components/roi/Entry/SucceedingYear/SuccedingYearsPotential';
import MachConSucce from '@/Components/roi/Entry/SucceedingYear/MachConSucce';
import SucceTotals from '@/Components/roi/Entry/SucceedingYear/succeTotals';
import { usePage } from '@inertiajs/react';

function Summary1stYear() {
  const { auth } = usePage().props;
  const role = auth.role;

  return (
    <div className='mx-5 print:mx-0 bg-[#B5EBA2]/5 border rounded-r-lg rounded-b-xl border-t-0 border-b-[#B5EBA2] border-x-[#B5EBA2] print:border-none print:bg-transparent'>
      <div className='mx-10 print:mx-0 print:pt-0 pt-8'>

        {/* ================= PAGE 1 ================= */}
        <div className="print-avoid-break">
          <CompanyInfoSum />

          <div className='grid grid-cols-[40%_60%] gap-4 mt-4 items-start print:[grid-template-columns:45%_55%] print:p-0 print:gap-0'>
            <div className="max-w-4xl w-full mt-3 print:ml-0 print:mt-0 print:mr-0">
              <TotalMVP />
            </div>
            <div className='mt-1 print:mt-0'>
              <InterestCalcuSum />
            </div>
          </div>

          <div className='grid grid-cols-[70%_30%] items-start gap-4 mt-2 print:mx-0 print:-mt-2 print:gap-0'>
            <div className='flex flex-col gap-2 pt-8 print:pt-7 print:gap-0'>
              <MachCon1stY />
            </div>
            <div>
              <Potentials />
            </div>
          </div>

          <Totals />
        </div>

        <div className="print-page-break" />

        {/* ================= PAGE 2 ================= */}
        <div>
          <div className='grid grid-cols-[40%_60%] items-start gap-4 mt-8 print:mt-0 print:mx-0 print:gap-2'>
            <div className='flex flex-col gap-2 pt-8 print:pt-7 print:gap-0'>
              <MachConSucce />
            </div>
            <div className="pr-4">
              <SucceedingYearsPotential />
            </div>
          </div>

          <SucceTotals />

          <div className="print-page-break" />

          <ContractDetails />

          {/* ADD NOTES / COMMENTS */}
       <div className='lg:mx-10 xl:mx-56 print:mx-0'>
          {/* Logic to show the input section based on role */}
          <div className='mb-4'>
              {/* 'user' sees the Comment UI (linked to project.comments) */}
              {role === 'user' && <AddComments type="comments" />}
              
              {/* 'reviewer' (confirm/approve) sees the Note UI (linked to project.notes) */}
              {role === 'reviewer' && <AddComments type="notes" />}
          </div>
          
          <Names />
      </div>

        </div>
      </div>
    </div>
  );
}

export default Summary1stYear;