import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react'; // Added Link
import Summary1stYear from './EntryRoutes/Summary1stYear';
import MachineConfigTab from './EntryRoutes/MachineConfigTab';
import SucceedingYears from './EntryRoutes/SucceedingYears';

// Receive activeTab as a prop from RoiController
export default function Entry({ activeTab = 'Machine Configuration' }) {
    
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

           {/* TABS - Changed buttons to Links to work with your new Routes */}
           <div className='mx-10 '>
                    <div className='flex gap-[2px]'>
                      <Link 
                        href={route('roi.entry.machine')} 
                        className={`px-7 text-sm py-2 ${activeTab === 'Machine Configuration' ? 'bg-[#B5EBA2]/20 border border-t-[#B5EBA2] font-medium border-x-[#B5EBA2] rounded-t-xl' : 'bg-[#B5EBA2]/80 rounded-t-xl' }`}
                      >
                        Machine Configuration
                      </Link>

                      <Link 
                        href={route('roi.entry.summary')} 
                        className={`px-7 text-sm py-2 ${activeTab === 'Summary' ? ' bg-[#B5EBA2]/20 font-medium border border-t-[#B5EBA2] border-x-[#B5EBA2] rounded-t-xl' : ' bg-[#B5EBA2]/80 rounded-t-xl'}`}
                      >
                        Summary/1st Year
                      </Link>

                      <Link 
                        href={route('roi.entry.succeeding')} 
                        className={`px-7 text-sm py-2 rounded-t-xl ${activeTab === 'Succeeding' ? ' bg-[#B5EBA2]/20 font-medium border border-t-[#B5EBA2] border-x-[#B5EBA2] rounded-t-xl' : ' bg-[#B5EBA2]/80 rounded-t-xl'}`}
                      >
                        Succeeding Years
                      </Link>
                    </div>
            </div>

           {/* CONTENT AREA */}
                {activeTab === 'Machine Configuration' ? (
                <MachineConfigTab />
                ) : activeTab === 'Succeeding' ? (
                <SucceedingYears />
                ) : (
                <Summary1stYear />
                )}
        </>
    );
}

Entry.layout = page => <AuthenticatedLayout children={page} />