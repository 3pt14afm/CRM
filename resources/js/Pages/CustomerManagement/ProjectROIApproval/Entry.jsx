import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Adjust path if needed
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Summary1stYear from './EntryRoutes/Summary1stYear';
import MachineConfigTab from './EntryRoutes/MachineConfigTab';
import SucceedingYears from './EntryRoutes/SucceedingYears';

export default function Entry() {
    
    const [tab, setTab] = useState('Machine Configuration');

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
                {tab === 'Machine Configuration' ? (
                <MachineConfigTab />
                ) : tab === 'Succeeding' ? (
                <SucceedingYears />
                ) : (
                <Summary1stYear />
                )}

           
        </>
    );
}

// THIS IS THE IMPORTANT PART
Entry.layout = page => <AuthenticatedLayout children={page} />