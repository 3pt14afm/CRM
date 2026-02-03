import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Adjust path if needed
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Fees from '../../../Components/roi/Entry/Fees'
import Cost from '@/Components/roi/Entry/Cost';
import MachineConfig from '@/Components/roi/Entry/MachineConfig';

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
          <div className='mx-10 bg-[#B5EBA2]/20 border rounded-r-lg rounded-b-xl border-t-0  border-b-[#B5EBA2] border-x-[#B5EBA2]'>
                  {/* THIS DIV IS FOR THE COMPANY INFO AND INTE */}
                    <div className='grid grid-cols-[60%_40%] px-10 pt-5 gap-5 mb-5'>

                        {/* company name */}
                        <div className='flex flex-col bg-white shadow-[0px_1px_10px_3px_rgba(0,_0,_0,_0.1)] rounded-lg p-5 gap-1'>
                            {/* company name and contract years */}
                            <div className='flex justify-between items-center'>
                                <div className='flex flex-col gap-1 w-[70%]'>
                                    <p className='font-bold text-[11px]'>COMPANY NAME</p>
                                    <input className='rounded-md border  text-sm outline-none focus:outline-none border-[#A6E28A]/60 h-10' type="text" placeholder='Enter Company Name'/>
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <p className='font-bold text-[11px]'>CONTRACT YEARS</p>
                                    <input className='rounded-md border text-sm  border-[#A6E28A]/60 h-10 w-32' type="text" placeholder='0' />
                                </div>
                            </div>
                            <div className='flex flex-col gap-2'>
                                <div className='flex flex-col mt-2 gap-1'>
                                    <p className='font-bold text-[11px]'>COMPANY TYPE</p>
                                    <input className='rounded-md border text-sm  border-[#A6E28A]/60 h-10' type="text" placeholder='Enter type'/>
                                </div>
                                <div className='flex flex-col'>
                                    <p className='font-bold text-[11px]'>PURPOSE</p>
                                    <input className='rounded-md border  text-sm border-[#A6E28A]/60 h-10' type="text" placeholder='Enter purpose'/>
                                </div>
                            </div>
                        </div>

                        {/* annual interests */}
                    {/* ANNUAL INTERESTS & YIELDS SECTION */}
<div className='flex flex-col gap-5 items-center justify-center '>
    
    {/* Annual Interest Table */}
    <div className="overflow-hidden rounded-xl border border-slate-300 shadow-[0px_6px_10px_3px_rgba(0,_0,_0,_0.1)] w-full max-w-md">
        <table className="min-w-full border-separate border-spacing-0">
            <thead>
                <tr>
                    <th className="border-b border-r border-slate-300 py-2 text-xs font-semibold bg-[#B5EBA2]/10 w-1/2">
                        Annual Interest
                    </th>
                    <th className="border-b border-slate-300 py-2 text-xs font-semibold bg-[#B5EBA2]/10 w-1/2">
                        Percentage Margin
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white">
                <tr>
                    <td className="border-r border-slate-300 p-2 text-center">
                        <input 
                            type="text" 
                            className="w-full text-xs rounded-lg h-8 text-center border border-[#DDDDDD]/50 outline-none focus:ring-1 focus:ring-green-400 bg-[#DDDDDD]/25" 
                            placeholder="0.00%"
                        />
                    </td>
                    <td className="p-2 text-center">
                        <input 
                            type="text" 
                            className="w-full text-xs rounded-lg h-8 text-center border border-[#DDDDDD]/50 outline-none focus:ring-1 focus:ring-green-400 bg-[#DDDDDD]/25" 
                            placeholder="0.00%"
                        />
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    {/* Yields Table */}
    <div className="overflow-hidden rounded-xl border border-slate-300 max-w-md shadow-[0px_6px_10px_3px_rgba(0,_0,_0,_0.1)] w-full">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
                <tr className="bg-[#F6FDF5]">
                    <th className="border-b border-r border-slate-200 p-3 w-1/3"></th>
                    <th className="border-b border-r border-slate-200 text-xs p-3 font-bold text-slate-800 w-1/3 text-center">Monthly Yields</th>
                    <th className="border-b border-slate-200 p-3 text-xs font-bold text-slate-800 w-1/3 text-center">Annual Yields</th>
                </tr>
            </thead>
            <tbody>
                {/* Row 1: Mono AMVP */}
                <tr className='text-center'>
                    <td className="bg-[#E9F7E7] text-[11px] px-2 border-b border-r border-slate-200 font-bold text-slate-800 text-center">
                        Mono AMVP
                    </td>
                    <td className="border-b border-r border-slate-200 p-2 bg-white">
                        <input 
                            type="text" 
                            placeholder="999,999"
                            className="w-full text-xs rounded-lg h-8 text-center border border-[#DDDDDD]/50 outline-none focus:ring-1 focus:ring-green-400 bg-[#DDDDDD]/25" 
                        />
                    </td>
                    <td className="border-b border-slate-200 p-2 bg-white">
                        <input 
                            type="text" 
                            placeholder="999,999"
                            className="w-full text-xs rounded-lg h-8 text-center border border-[#DDDDDD]/50 outline-none focus:ring-1 focus:ring-green-400 bg-[#DDDDDD]/25" 
                        />
                    </td>
                </tr>
                {/* Row 2: Color AMVP */}
                <tr className='text-center'>
                    <td className="bg-[#E9F7E7] text-[11px] border-r border-slate-200 p-2 font-bold text-slate-800 text-center">
                        Color AMVP
                    </td>
                    <td className="border-r border-slate-200 p-2 bg-white">
                        <input 
                            type="text" 
                            placeholder="999,999"
                            className="w-full text-xs rounded-lg h-8 text-center border border-[#DDDDDD]/50 outline-none focus:ring-1 focus:ring-green-400 bg-[#DDDDDD]/25" 
                        />
                    </td>
                    <td className="p-2 bg-white">
                        <input 
                            type="text" 
                            placeholder="999,999"
                            className="w-full text-xs rounded-lg h-8 text-center border border-[#DDDDDD]/50 outline-none focus:ring-1 focus:ring-green-400 bg-[#DDDDDD]/25" 
                        />
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
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