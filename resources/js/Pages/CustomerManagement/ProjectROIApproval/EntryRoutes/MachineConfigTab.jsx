import React from 'react'

import Cost from '@/Components/roi/Entry/MachineConfiguration/Cost';
import MachineConfig from '@/Components/roi/Entry/MachineConfiguration/MachineConfig';
import InterestCalculator from '@/Components/roi/Entry/MachineConfiguration/InterestCalcu';
import CompanyInfo from '@/Components/roi/Entry/MachineConfiguration/CompanyInfo';
import Yields from '@/Components/roi/Entry/MachineConfiguration/Yields';
import Fees from '@/Components/roi/Entry/MachineConfiguration/Fees';
import { useState } from 'react';
function MachineConfigTab({buttonClicked, readOnly}) {

        
    //state for the company info 
    const [companyName, setCompanyName] = useState('');
    const[contractYears, setContractYears] = useState(0);
    const [companyTypes, setCompanyTypes] = useState('');
    const [purpose, setPurpose] = useState('');


    //state for interest calculator
    const [annualInterest, setAnnualInterest] = useState(0);
    const [percentMargin, setPercentMargin] = useState(0);          
            
  return (
        <div className='mx-5 bg-lightgreen/5 border rounded-r-lg rounded-b-xl border-t-0  border-b-[#B5EBA2]/80 border-x-[#B5EBA2]/80'>
                  {/* THIS DIV IS FOR THE COMPANY INFO AND INTErest*/}
            <div className='flex items-center px-10 pt-5 gap-5 mb-5'>
                    <CompanyInfo buttonClicked={buttonClicked} readOnly={readOnly}/>
                        {/* annual interests */}
                    {/* ANNUAL INTERESTS & YIELDS SECTION */}
                  <div className='flex flex-col mt-3 gap-5 items-start justify-start '>
                    {/* annual and monthly interest container */}
                    <InterestCalculator buttonClicked={buttonClicked} readOnly={readOnly}/>
                    {/* Yields table */}
                    <Yields buttonClicked={buttonClicked} readOnly={readOnly}/>
                  </div>
            </div>

                  <MachineConfig buttonClicked={buttonClicked} readOnly={readOnly}/>

                    {/* FEES AND TOTAL PROJECT COST */}

                    <div className='grid grid-cols-[75%_25%] mx-7 items-center pt-5 mb-9'>
                        <Fees buttonClicked={buttonClicked} readOnly={readOnly}/>
                     
                    </div>

          </div>
  )
}

export default MachineConfigTab