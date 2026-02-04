import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Adjust path if needed
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Fees from '../../../Components/roi/Entry/Fees'
import Cost from '@/Components/roi/Entry/Cost';
import MachineConfig from '@/Components/roi/Entry/MachineConfig';
import InterestCalculator from '@/Components/roi/Entry/InterestCalcu';
import CompanyInfo from '@/Components/roi/Entry/CompanyInfo';
import Yields from '@/Components/roi/Entry/Yields';

export default function Entry() {
    
    const [tab, setTab] = useState('Machine Configuration');
    
    //state for the company info 
    const [companyName, setCompanyName] = useState('');
    const[contractYears, setContractYears] = useState(0);
    const [companyTypes, setCompanyTypes] = useState('');
    const [purpose, setPurpose] = useState('');


    //state for interest calculator
    const [annualInterest, setAnnualInterest] = useState(0);
    const [percentMargin, setPercentMargin] = useState(0);          
            
    return (
        <>
            <Head title="ROI Entry"/>
            <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
                <div className='flex gap-1'>
                    <h1 className="font-semibold mt-3">Project ROI Approval</h1>
                <p className='mt-3'>/</p>
                <p className="text-3xl font-semibold">Entry</p>
                </div>
                <div className='flex flex-col gap-1 items-end'>
                <h1 className="text-xs text-right text-slate-500">02/03/26</h1>
                <p className="text-base font-semibold text-right">Reference: 1234567</p>
                </div>
            </div>

           {/* TABS */}
           <div className='mx-10 '>
                   <div className='flex gap-[2px]'>
                     <button onClick={()=>setTab('Machine Configuration')} className={`px-7 text-sm  py-2 ${tab === 'Machine Configuration' ? 'bg-[#B5EBA2]/20  border border-t-[#B5EBA2] font-medium border-x-[#B5EBA2] rounded-t-xl' :  'bg-[#B5EBA2]/80 rounded-t-xl' }`}>Machine Configuration</button>
                     <button onClick={()=>setTab('Summary')} className={`px-7 text-sm  py-2    ${tab === 'Summary' ? ' bg-[#B5EBA2]/20 font-medium  border border-t-[#B5EBA2] border-x-[#B5EBA2] rounded-t-xl' : ' bg-[#B5EBA2]/80 rounded-t-xl'}`}>Summary/1st Year</button>
                     <button onClick={()=>setTab('Succeeding')} className={`px-7 text-sm  py-2 rounded-t-xl ${tab === 'Succeeding' ? ' bg-[#B5EBA2]/20 font-medium  border border-t-[#B5EBA2] border-x-[#B5EBA2] rounded-t-xl' : ' bg-[#B5EBA2]/80 rounded-t-xl'}`}>Succeeding Years</button>
                   </div>
            </div>

           {/* THIS DIV IS THE CONTAINER OF ALL THE TABLES*/}
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

                    <div className='grid grid-cols-[60%_40%] mx-7 mb-9'>
                        <Fees/>
                        <Cost/>
                    </div>

          </div>

           
        </>
    );
}

// THIS IS THE IMPORTANT PART
Entry.layout = page => <AuthenticatedLayout children={page} />