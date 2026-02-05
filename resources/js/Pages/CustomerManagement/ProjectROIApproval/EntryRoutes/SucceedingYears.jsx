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

function SucceedingYears() {
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
                

                {/* ADD NOTES AND ADD COMMENTS */}
                <div className='grid grid-cols-2 items-center gap-4'>
                <AddNotes />
                <AddComments />
                </div>

                <Names />
           </div>
           
      </div>
  )
}

export default SucceedingYears