import React from 'react';
import { MdClose, MdLocationOn, MdBusiness, MdPhone, MdInfoOutline, MdAdd, MdPersonOutline, MdPerson3 } from 'react-icons/md';
import { BsPatchCheckFill } from 'react-icons/bs'; 
import { FiEdit } from 'react-icons/fi';

export default function CompanyDetailsSidebar({ isOpen, company, onClose }) {

    // Helper to get initials for the avatar circle
    const getInitials = (name) => {
        if (!name) return '??';
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <>
            {/* Inline CSS for the subtle moving gradient */}
            <style>{`
                @keyframes pan-gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-moving-gradient {
                    background-size: 200% 200%;
                    animation: pan-gradient 12s ease infinite;
                }
            `}</style>

            {/* Backdrop - Fades in and out smoothly */}
            <div 
                className={`fixed inset-0 backdrop-blur-[1px] bg-black/10 z-40 transition-all duration-500 ease-out ${ isOpen ? 'opacity-100 visible' : 'opacity-0 invisible' }`}
                onClick={onClose}
            />

            {/* Sidebar Panel - Slides in and out smoothly using translate-x */}
            <div className={`fixed inset-y-0 right-4 z-50 w-full max-w-[500px] my-5 bg-gradient-to-br from-[#FDFDFD] via-[#f2faee] to-[#FDFDFD] animate-moving-gradient shadow-[-10px_0_20px_rgba(0,0,0,0.05)] border-l border-b border-black/15 flex flex-col rounded-3xl transform transition-transform duration-500 ease-out  ${ isOpen ? 'translate-x-0' : 'translate-x-[120%]' }`}>
                
                <div className="absolute -left-5 top-9">
                    <button 
                        onClick={onClose} 
                        className="bg-white border border-gray-200 shadow-sm p-1.5 rounded-full hover:bg-gray-50 transition-colors"
                    >
                        <MdClose size={22} className="text-gray-700" />
                    </button>
                </div>

                {/* Company Details Title Header */}
                <div className="px-7 pt-5 pb-2 flex justify-between flex-shrink-0">
                    <h2 className="text-base font-bold text-slate-800">Company Details</h2>
                    <FiEdit className="text-slate-800 text-lg mt-1 transition-colors transition-duration-100ms cursor-pointer hover:text-[#195c00] hover:text-xl" />
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-8 pt-1 pb-10 [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#195c0059]">
                    {company ? (
                        <div className="flex flex-col">
                            
                            {/* Profile Header */}
                            <div className="flex flex-col items-center">
                                {/* Initials Avatar with Badge */}
                                <div className="relative inline-block">
                                    <div className="w-[90px] h-[90px] bg-[#195c00] rounded-full flex items-center justify-center text-white text-3xl font-medium shadow-sm">
                                        {getInitials(company.company_name)}
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-white p-[2px] rounded-full shadow-sm">
                                        <BsPatchCheckFill className="text-[#195c00] text-xl bg-white rounded-full" />
                                    </div>
                                </div>
                                
                                <h2 className="text-lg font-extrabold text-slate-800 mt-4 text-center uppercase tracking-tight">
                                    {company.company_name}
                                </h2>
                                <p className="text-[13px] font-medium text-slate-500 mt-0.5 uppercase text-center">
                                    ({company.client_category || 'N/A'})
                                </p>
                            </div>

                            {/* Key Stats Card */}
                            <div className="mt-5 bg-[#F6F7F8]/80 backdrop-blur-sm rounded-2xl py-3 px-4 flex justify-around items-center border border-[#00000010] border-b-black/20 border-r-black/20 shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)]">
                                <div className="text-center flex flex-col items-center">
                                    <div className="font-bold text-slate-800 uppercase tracking-tight">
                                        {company.sap_code || '—'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                        SAP CODE
                                    </div>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                    <div className="font-bold text-slate-800 uppercase tracking-tight">
                                        {company.delsan_company || '—'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                        COMPANY
                                    </div>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                    <div className={`font-bold uppercase tracking-tight ${company.status == 1 ? 'text-[#195c00]' : 'text-[#C40000]'}`}>
                                        {company.status == 1 ? 'ACTIVE' : 'INACTIVE'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                        STATUS
                                    </div>
                                </div>
                            </div>

                            {/* Client Manager Card */}
                            <div className="mt-4 border border-[#00000010] border-b-black/20 border-r-black/20 shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)] rounded-2xl bg-[#F6F7F8]/80 backdrop-blur-sm overflow-hidden">
                                <div className="px-5 pt-4 border-b border-gray-50 flex justify-between items-center bg-[#F6F7F8]">
                                    <h3 className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">Client Manager</h3>
                                    <MdPersonOutline className="text-slate-400 text-lg" />
                                </div>
                                <div className="p-5 pt-4">
                                    {company.id_client_mngr ? (
                                        <div className="flex items-center gap-4">
                                            {/* Manager Avatar */}
                                            <div className="relative flex-shrink-0">
                                                <div className="w-9 h-9 rounded-full bg-[#289800]/10 border border-[#289800]/10 flex items-center justify-center text-[#195c00] text-sm font-semibold shadow-sm">
                                                    <MdPerson3 className="text-xl" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Assigned Manager</div>
                                                <div className="text-[14px] font-semibold text-slate-800 leading-tight">
                                                    {company.id_client_mngr}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-dashed border-slate-300">
                                                <MdPersonOutline className="text-slate-400 text-xl" />
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Assigned Manager</div>
                                                <div className="text-[13px] font-medium text-slate-400 italic">Not assigned</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact & Location Card */}
                            <div className="mt-4 border border-[#00000010] border-b-black/20 border-r-black/20 shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)] rounded-2xl bg-[#F6F7F8]/80 backdrop-blur-sm overflow-hidden">
                                <div className="px-5 pt-4 border-b border-gray-50 flex justify-between items-center bg-[#F6F7F8]">
                                    <h3 className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">Contact & Location</h3>
                                    <MdInfoOutline className="text-slate-400 text-lg" />
                                </div>
                                
                                <div className="p-5 pt-4 flex flex-col gap-6">
                                    {/* Address */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                                            <MdLocationOn className="text-[#289800] text-xl" />
                                        </div>
                                        <div className="pt-0.5">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Address</div>
                                            <div className="text-[14px] font-medium text-slate-800 leading-tight">
                                                {company.address || 'Not provided'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Branch */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                                            <MdBusiness className="text-[#289800] text-xl" />
                                        </div>
                                        <div className="pt-0.5">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Branch</div>
                                            <div className="text-[14px] font-medium text-slate-800 leading-tight">
                                              {company.main_location || 'Not provided'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Number */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                                            <MdPhone className="text-[#289800] text-xl" />
                                        </div>
                                        <div className="pt-0.5">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Contact Number</div>
                                            <div className="text-[14px] font-medium text-slate-800 leading-tight">
                                                {company.contact_no || 'Not Provided'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Branches Card */}
                            <div className="mt-4 border border-[#00000010] border-b-black/20 border-r-black/20 shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)] rounded-2xl bg-[#F6F7F8]/80 backdrop-blur-sm overflow-hidden pb-5">
                                <div className="px-5 py-4 bg-[#F6F7F8] flex justify-between items-center">
                                    <h3 className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">Branches</h3>
                                    {Array.isArray(company.branches) && company.branches.length > 0 && (
                                        <span className="text-[10px] font-semibold text-[#195c00] bg-[#195c00]/10 px-2 py-0.5 rounded-full">
                                            {company.branches.length}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="px-5 flex flex-wrap gap-2 mt-0.5">
                                    {Array.isArray(company.branches) && company.branches.length > 0 ? (
                                        company.branches.map((branch, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2 bg-[#F6F7F8] shadow-inner border border-gray-300 px-3 py-1.5 rounded-md text-[13px] font-medium text-slate-700"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#195c00]"></div>
                                                {typeof branch === 'object' ? (branch.name || branch.branch_name || JSON.stringify(branch)) : branch}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-2 bg-[#F6F7F8] shadow-inner border border-gray-300 px-3 py-1.5 rounded-md text-[13px] font-medium text-slate-400 italic">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                            No branches listed
                                        </div>
                                    )}
                                    
                                    <button className="flex items-center justify-center w-8 h-[34px] rounded-md border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors">
                                        <MdAdd size={18} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-slate-400 font-medium">Select a company to view details...</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}