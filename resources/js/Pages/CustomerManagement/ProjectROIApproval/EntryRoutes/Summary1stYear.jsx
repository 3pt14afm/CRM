import AddComments from '@/Components/roi/Entry/AddComments';
import AddNotes from '@/Components/roi/Entry/AddNotes';
import CompanyInfoSum from '@/Components/roi/Entry/CompanyInfoSum';
import ContractDetails from '@/Components/roi/Entry/Summary1stYear/ContractDetails';
import InterestCalcuSum from '@/Components/roi/Entry/InterestCalcuSum';
import Names from '@/Components/roi/Entry/Names';
import TotalMVP from '@/Components/roi/Entry/TotalMVP';
import React from 'react';
import SucceTotals from '@/Components/roi/Entry/SucceedingYear/succeTotals';
import { usePage } from '@inertiajs/react';
import EntryRemarksSummary from '@/Components/roi/Entry/Summary1stYear/EntryRemarksSummary';
import MachCon1stYearMerged from '@/Components/roi/Entry/Summary1stYear/MachCon1stYearMerged';
import MachConSucceMerged from '@/Components/roi/Entry/SucceedingYear/MachConSucceMerged';

function Summary1stYear() {
  const { auth } = usePage().props;
  const role = auth.role;
  const reviewerRoles = ['reviewer', 'checker', 'endorser', 'confirmer', 'approver'];
 
  return (
    <div className='mx-5 print:mx-0 bg-[#f8f8f8] print:bg-white border rounded-r-lg rounded-b-xl border-t-[#2c2c2e]/10 border-b-[#2c2c2e]/30 border-[#2c2c2e]/20 shadow-md print:shadow-none print:justify-center print:border-none print:bg-transparent'>
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

          <div className='mt-2 pt-8 print:mx-0 print:-mt-2 print:pt-7'>
            <MachCon1stYearMerged />
          </div>
        </div>

        <div className="print-page-break" />

        {/* ================= PAGE 2 ================= */}
        <div>
          <div className='mt-8 pt-8 print:mt-0 print:mx-0 print:pt-7'>
            <MachConSucceMerged />
          </div>

          <SucceTotals />

          <div className="print-page-break" />

          <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-5 items-start print:grid-cols-[70%_30%] print:gap-0 print:items-start">
            <ContractDetails />
            <EntryRemarksSummary />
          </div>

          {/* ADD NOTES / COMMENTS */}
          <div className='lg:mx-20 print:mx-0 pt-5'>
            <div className='mb-4 grid grid-cols-2 gap-4 items-start'>
              <div>
                <AddNotes />
              </div>
              <div>
                <AddComments />
              </div>
            </div>

            <Names />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Summary1stYear;