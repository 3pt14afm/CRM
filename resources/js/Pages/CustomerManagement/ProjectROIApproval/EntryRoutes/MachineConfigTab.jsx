import React from 'react'

import Cost from '@/Components/roi/Entry/MachineConfiguration/Cost';
import MachineConfig from '@/Components/roi/Entry/MachineConfiguration/MachineConfig';
import InterestCalculator from '@/Components/roi/Entry/MachineConfiguration/InterestCalcu';
import CompanyInfo from '@/Components/roi/Entry/MachineConfiguration/CompanyInfo';
import Yields from '@/Components/roi/Entry/MachineConfiguration/Yields';
import Fees from '@/Components/roi/Entry/MachineConfiguration/Fees';
import { useState } from 'react';
function MachineConfigTab({}) {

        
    //state for the company info 
    const [companyName, setCompanyName] = useState('');
    const[contractYears, setContractYears] = useState(0);
    const [companyTypes, setCompanyTypes] = useState('');
    const [purpose, setPurpose] = useState('');


    //state for interest calculator
    const [annualInterest, setAnnualInterest] = useState(0);
    const [percentMargin, setPercentMargin] = useState(0);          
            
  return (
        <div className='mx-10 bg-[#B5EBA2]/20 border rounded-r-lg rounded-b-xl border-t-0  border-b-[#B5EBA2] border-x-[#B5EBA2]'>
                  {/* THIS DIV IS FOR THE COMPANY INFO AND INTErest*/}
                 <div className='flex items-center px-10 pt-5 gap-3 mb-5'>

                      <CompanyInfo companyName={companyName} contractYears={contractYears} companyTypes={companyTypes} purpose={purpose}
                                   setCompanyName={setCompanyName} setContractYears={setContractYears} setCompanyTypes ={setCompanyTypes} setPurpose={setPurpose}
                       />
                        {/* annual interests */}
                    {/* ANNUAL INTERESTS & YIELDS SECTION */}
                   <div className='flex flex-col gap-5 items-center justify-center '>
                    {/* annual and monthly interest container */}
                    <InterestCalculator annualInterest={annualInterest} setAnnualInterest={setAnnualInterest} percentMargin={percentMargin} setPercentMargin={setPercentMargin} contractYears={contractYears}/>
                     {/* Yields table */}
                     <Yields/>
                   </div>
            </div>

                  <MachineConfig />

                    {/* FEES AND TOTAL PROJECT COST */}

                    <div className='grid grid-cols-[60%_40%] mx-7 items-center pt-5 mb-9'>
                        <Fees/>
                        <Cost/>
                    </div>

          </div>
  )
}

export default MachineConfigTab