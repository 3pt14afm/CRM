import AddComments from '@/Components/roi/Entry/AddComments';
import AddNotes from '@/Components/roi/Entry/AddNotes';
import CompanyInfoSum from '@/Components/roi/Entry/CompanyInfoSum';
import ContractDetails from '@/Components/roi/Entry/Summary1stYear/ContractDetails';
import InterestCalcuSum from '@/Components/roi/Entry/InterestCalcuSum';
import MachCon1stY from '@/Components/roi/Entry/Summary1stYear/MachCon1stY';
import Names from '@/Components/roi/Entry/Names';
import TotalMVP from '@/Components/roi/Entry/TotalMVP';
import Totals from '@/Components/roi/Entry/Summary1stYear/Totals';
import React from 'react'
import Potentials from '@/Components/roi/Entry/Potentials';


function Summary1stYear() {
   


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


               <div className='grid grid-cols-[70%_30%] items-center gap-10 mx-10 mt-6 mb-5'>
                   <div className='flex flex-col gap-3'>
                         {/* MACHINE & CONSUMABLES */}
                        <MachCon1stY />
                        
                        {/* TOTAL OTHERS */}
                        <Totals />
                
                   </div>
                    <div className='-mt-32'>
                        <Potentials />
                    </div>
               </div>
         
                {/* CONTRACT DETAILS */}
                <ContractDetails />

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

export default Summary1stYear;