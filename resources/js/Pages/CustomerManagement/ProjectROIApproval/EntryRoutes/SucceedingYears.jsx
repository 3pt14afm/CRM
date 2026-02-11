import React from 'react'
import AddComments from '@/Components/roi/Entry/AddComments'
import AddNotes from '@/Components/roi/Entry/AddNotes'
import CompanyInfoSum from '@/Components/roi/Entry/CompanyInfoSum'
import TotalMVP from '@/Components/roi/Entry/TotalMVP'
import InterestCalcuSum from '@/Components/roi/Entry/InterestCalcuSum'
import MachCon1stY from '@/Components/roi/Entry/Summary1stYear/MachCon1stY'
import Totals from '@/Components/roi/Entry/Summary1stYear/Totals'
import ContractDetails from '@/Components/roi/Entry/Summary1stYear/ContractDetails'
import Names from '@/Components/roi/Entry/Names'
import Potentials from '@/Components/roi/Entry/Potentials'
import SucceedingYearsPotential from '@/Components/roi/Entry/SucceedingYear/SuccedingYearsPotential'
import { useProjectData } from '@/Context/ProjectContext'

function SucceedingYears() {

  const { projectData } = useProjectData();
  
  // Extract contract years, defaulting to 1 if not found
  const contractYears = Number(projectData?.companyInfo?.contractYears) || 1;

  // Create an array for the succeeding years (Year 2 to Year X)
  // If contractYears is 5, this creates [2, 3, 4, 5]
  const potentialYears = Array.from(
    { length: contractYears - 1 }, 
    (_, i) => i + 2
  );
  
      
  return (
            <div className='mx-10 bg-[#B5EBA2]/5 border rounded-r-lg rounded-b-xl border-t-0  border-b-[#B5EBA2] border-x-[#B5EBA2]'>
            <div className='mx-10 pt-8'> 
                {/* The "One Piece" Illusion Container */}
              
                <CompanyInfoSum />

                {/* TOTAL MVP AND ANNUAL INTERESTS */}
               <div className='grid grid-cols-2 mt-4 items-center'>

                    <div class="max-w-4xl w-full mx-auto p-4">
                        <TotalMVP />
                    </div>
                    
                    <div className='-mt-10'>
                    <InterestCalcuSum />
                    </div>

                </div>

                <div className="my-6 mb-10 mx-auto flex flex-wrap justify-center gap-y-12">
  {potentialYears.map((year) => (
    <div key={year} className="flex-[0_0_400px]">
      <SucceedingYearsPotential
        title={`${year}${getOrdinalSuffix(year)} Year Potential`}
      />
    </div>
  ))}
</div>
                

                {/* ADD NOTES AND ADD COMMENTS */}
                <div className='grid grid-cols-2 items-center gap-4' >
                <AddNotes scopeKey="roi-succeding-years" />
                <AddComments scopeKey="roi-succeeding-years" />
                </div>

                <Names />
           </div>
           
      </div>
  )
}

// Simple helper to get "st", "nd", "rd", "th" suffixes
function getOrdinalSuffix(i) {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

export default SucceedingYears