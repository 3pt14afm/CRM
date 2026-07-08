import React, { useState, useEffect } from 'react';
import { MdClose, MdLocationOn, MdBusiness, MdPhone, MdInfoOutline, MdAdd, MdPersonOutline, MdPerson3, MdOpenInFull, MdOutlineMap, MdCheck } from 'react-icons/md';
import { BsPatchCheckFill } from 'react-icons/bs'; 
import { FiEdit } from 'react-icons/fi';
import { IoWarningOutline } from 'react-icons/io5';

export default function CompanyDetailsSidebar({ isOpen, company, onClose, isPotential = false, onSave }) {

    // Controls the centered "expanded map" modal
    const [isMapExpanded, setIsMapExpanded] = useState(false);

    // Controls the single edit mode (toggled from the header FiEdit button) that
    // reveals editable Address / Contact Number inputs together (Potentials only)
    const [isEditMode, setIsEditMode] = useState(false);
    const [editAddress, setEditAddress] = useState('');
    const [editContact, setEditContact] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    // Field-level validation errors (Address & Contact Number are required)
    const [errors, setErrors] = useState({ address: false, contact: false });
    // Controls the "you have unsaved changes" confirmation popup shown
    // when the user tries to close the modal while still editing
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // Reset any in-progress edit whenever the selected company changes
    useEffect(() => {
        setIsEditMode(false);
        setEditAddress(company?.address || '');
        setEditContact(company?.contact_no || '');
        setIsSaving(false);
        setErrors({ address: false, contact: false });
        setShowCloseConfirm(false);
    }, [company?.id]);

    const startEdit = () => {
        setEditAddress(company?.address || '');
        setEditContact(company?.contact_no || '');
        setErrors({ address: false, contact: false });
        setIsEditMode(true);
    };

    const cancelEdit = () => {
        setIsEditMode(false);
        setEditAddress(company?.address || '');
        setEditContact(company?.contact_no || '');
        setErrors({ address: false, contact: false });
    };

    // Returns true on a successful save, false if validation failed or the
    // save itself threw.
    const saveEdit = async () => {
        if (!company || !onSave) return false;

        const trimmedAddress = editAddress.trim();
        const trimmedContact = editContact.trim();
        const nextErrors = {
            address: trimmedAddress.length === 0,
            contact: trimmedContact.length === 0,
        };
        setErrors(nextErrors);

        // Address and Contact Number are required (non-nullable) - block save
        if (nextErrors.address || nextErrors.contact) {
            return false;
        }

        setIsSaving(true);
        try {
            await onSave(company.id, {
                address: editAddress,
                contact_no: editContact,
            });
            setIsEditMode(false);
            return true;
        } catch (err) {
            console.error('Failed to save company details:', err);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // Any attempt to close the sidebar goes through here. If the user is
    // mid-edit AND has actually typed something into Address or Contact
    // Number, we don't close immediately - we surface a confirmation
    // popup asking them to save (or discard) first. If both fields are
    // empty, there's nothing to lose, so we just close directly.
    const attemptClose = () => {
        const hasInput = editAddress.trim().length > 0 || editContact.trim().length > 0;
        if (isEditMode && hasInput) {
            setShowCloseConfirm(true);
            return;
        }
        if (isEditMode) {
            setIsEditMode(false);
        }
        onClose();
    };

    // "Save & Close" action from within the confirmation popup
    const saveAndCloseFromWarning = async () => {
        const success = await saveEdit();
        // Only dismiss the popup if the save actually succeeded. On
        // validation failure (or a thrown save error) the popup stays
        // open and shows the relevant error(s) so the user can act on
        // "Keep Editing" or "Discard & Close" with full context.
        if (success) {
            setShowCloseConfirm(false);
            onClose();
        }
    };

    // "Discard & Close" action from within the confirmation popup
    const discardAndClose = () => {
        cancelEdit();
        setShowCloseConfirm(false);
        onClose();
    };

    // Helper to get initials for the avatar circle
    const getInitials = (name) => {
        if (!name) return '??';
        return name.substring(0, 2).toUpperCase();
    };

    // Builds a Google Maps embed URL from a plain address string.
    // Uses the public maps.google.com "output=embed" endpoint so it works
    // without a Google Maps API key. If you already have a Maps Embed API
    // key, swap this for https://www.google.com/maps/embed/v1/place?key=...&q=...
    const getMapEmbedSrc = (address, zoom = 15) => {
        if (!address) return null;
        return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom}&output=embed`;
    };

    const mapEmbedSrc = company ? getMapEmbedSrc(company.address) : null;

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
                onClick={attemptClose}
            />

            {/* Positioning wrapper - centers as a dialog on mobile, right-aligns as a sidebar from sm up */}
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end pointer-events-none">

                {/* Panel - Slides in on desktop, fades/scales in as a modal on mobile */}
                <div className={`relative w-full max-h-[80vh] sm:max-h-none sm:w-[80%] md:max-w-[500px] sm:my-5 sm:mr-4 bg-[#f5f5f7]/80 backdrop-blur animate-moving-gradient shadow-[-10px_0_20px_rgba(0,0,0,0.05)] border border-b border-black/15 flex flex-col rounded-t-3xl sm:rounded-3xl transform transition-transform duration-700 md:duration-500 ease-out ${ isOpen ? 'translate-y-0 sm:translate-x-0 pointer-events-auto' : 'translate-y-full sm:translate-y-0 sm:translate-x-[120%] pointer-events-none' }`}>

                    {/* Floating close tab - sidebar style, sm and up only */}
                    <div className="hidden sm:block absolute -left-5 top-9">
                        <button 
                            onClick={attemptClose} 
                            className="hidden sm:inline bg-white border border-gray-200 shadow-sm p-1.5 rounded-full hover:bg-gray-50 transition-colors"
                        >
                            <MdClose size={22} className="text-gray-700" />
                        </button>
                    </div>

                    {/* Company Details Title Header */}
                    <div className="px-4 md:px-7 p-3.5 flex justify-between items-center flex-shrink-0 rounded-t-3xl">
                        <div className="flex items-center gap-4">
                            {isPotential && isEditMode ? (
                                <div className="sm:hidden flex items-center gap-3">
                                    <MdCheck
                                        onClick={!isSaving ? saveEdit : undefined}
                                        className={`text-[#195c00] text-lg cursor-pointer hover:text-[#0f3800] ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
                                    />
                                    <MdClose
                                        onClick={!isSaving ? cancelEdit : undefined}
                                        className={`text-red-500 text-lg cursor-pointer hover:text-red-700 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
                                    />
                                </div>
                            ) : (
                                isPotential && (
                                    <FiEdit
                                        onClick={startEdit}
                                        className="sm:hidden text-slate-800 text-md md:text-lg transition-colors transition-duration-100ms hover:text-[#195c00] hover:text-xl cursor-pointer"
                                    />
                                )
                            )}
                            <h2 className="text-sm md:text-base font-bold text-slate-800">Company Details</h2>
                        </div>

                        {isPotential && isEditMode ? (
                            <div className="hidden sm:flex items-center gap-3">
                                <MdCheck
                                    onClick={!isSaving ? saveEdit : undefined}
                                    className={`text-[#195c00] text-lg cursor-pointer hover:text-[#0f3800] ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
                                />
                                <MdClose
                                    onClick={!isSaving ? cancelEdit : undefined}
                                    className={`text-red-500 text-lg cursor-pointer hover:text-red-700 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
                                />
                            </div>
                        ) : (
                            isPotential && (
                                <FiEdit
                                    onClick={startEdit}
                                    className="hidden sm:inline text-slate-800 text-md md:text-lg transition-colors transition-duration-100ms hover:text-[#195c00] hover:text-xl cursor-pointer"
                                />
                            )
                        )}
    
                        <button
                            onClick={attemptClose}
                            className="sm:hidden text-md text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <MdClose  />
                        </button>
                        
                    </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-3 md:px-8 pt-5 pb-10 [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#195c0059]">
                    {company ? (
                        <div className="flex flex-col">
                            
                            {/* Profile Header */}
                            <div className="flex flex-col items-center">
                                {/* Initials Avatar with Badge */}
                                <div className="relative inline-block">
                                    <div className="size-[75px] md:w-[90px] md:h-[90px] bg-[#195c00] rounded-full flex items-center justify-center text-white text-3xl font-medium shadow-sm">
                                        {getInitials(company.company_name)}
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-white p-[2px] rounded-full shadow-sm">
                                        <BsPatchCheckFill className="text-[#195c00] text-xl bg-white rounded-full" />
                                    </div>
                                </div>
                                
                                <h2 className="text-md md:text-lg font-extrabold text-slate-800 mt-4 text-center uppercase tracking-tight">
                                    {company.company_name}
                                </h2>
                                <p className="text-[11px] md:text-[13px] font-medium text-slate-500 mt-0.5 uppercase text-center">
                                    ({company.client_category || 'N/A'})
                                </p>
                            </div>

                            {/* Key Stats Card */}
                            <div className="mt-4 md:mt-5 bg-[#F2FAEE] backdrop-blur-sm rounded-2xl py-2 md:py-3 px-4 flex justify-around items-center border border-[#00000010] border-b-black/20 border-r-black/20 shadow-sm md:shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)]">
                                <div className="text-center flex flex-col items-center">
                                    <div className="text-xs md:text-base font-bold text-slate-800 uppercase tracking-tight">
                                        {company.sap_code || '—'}
                                    </div>
                                    <div className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                        SAP CODE
                                    </div>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                    <div className="text-xs md:text-base font-bold text-slate-800 uppercase tracking-tight">
                                        {company.delsan_company || '—'}
                                    </div>
                                    <div className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                        COMPANY
                                    </div>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                    <div className={`text-xs md:text-base font-bold uppercase tracking-tight ${company.status == 1 ? 'text-[#195c00]' : 'text-[#C40000]'}`}>
                                        {company.status == 1 ? 'ACTIVE' : 'INACTIVE'}
                                    </div>
                                    <div className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                        STATUS
                                    </div>
                                </div>
                            </div>

                            {/* Client Manager Card */}
                            <div className="mt-2.5 md:mt-4 border border-[#00000010] border-b-black/20 border-r-black/20 shadow-sm md:shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)] rounded-2xl bg-[#F2FAEE] backdrop-blur-sm overflow-hidden">
                                <div className="px-5 pt-4 border-b border-gray-50 flex justify-between items-center bg-[#F2FAEE]">
                                    <h3 className="text-[10px] md:text-[11px] font-bold text-slate-600 tracking-wide uppercase">Account Manager</h3>
                                    <MdPersonOutline className="text-slate-400 text-md md:text-lg" />
                                </div>
                                <div className="p-4 pt-2.5 md:p-5 md:pt-4">
                                    {company.id_client_mngr ? (
                                        <div className="flex items-center gap-4">
                                            {/* Manager Avatar */}
                                            <div className="relative flex-shrink-0">
                                                <div className="size-8 md:size-9 rounded-full bg-[#289800]/10 border border-[#289800]/10 flex items-center justify-center text-[#195c00] text-sm font-semibold shadow-sm">
                                                    <MdPerson3 className="text-lg md:text-xl" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">(ID) {company.id_client_mngr}</div>
                                                <div className="text-[13px] md:text-[14px] font-semibold text-slate-800 leading-tight">
                                                    {company.client_manager || company.id_client_mngr}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 md:size-11 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-dashed border-slate-300">
                                                <MdPersonOutline className="text-slate-400 text-xl" />
                                            </div>
                                            <div>
                                                <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Assigned Manager</div>
                                                <div className="text-[13px] md:text-[14px] font-medium text-slate-400 italic">Not assigned</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact & Location Card */}
                            <div className="mt-2.5 md:mt-4 border border-[#00000010] border-b-black/20 border-r-black/20 shadow-sm md:shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)] rounded-2xl bg-[#F2FAEE] backdrop-blur-sm overflow-hidden">
                                <div className="px-5 pt-4 border-b border-gray-50 flex justify-between items-center bg-[#F2FAEE]">
                                    <h3 className="text-[10px] md:text-[11px] font-bold text-slate-600 tracking-wide uppercase">Contact & Location</h3>
                                    <MdInfoOutline className="text-slate-400 text-md md:text-lg" />
                                </div>
                                
                                <div className="p-4 pt-2.5 md:p-5 md:pt-4 flex flex-col gap-4 md:gap-6">
                                    {/* Map Preview */}
                                    {mapEmbedSrc && (
                                        <button
                                            type="button"
                                            onClick={() => setIsMapExpanded(true)}
                                            className="group relative w-full h-28 md:h-32 rounded-xl overflow-hidden border border-[#00000010] shadow-sm text-left"
                                            aria-label="Expand map"
                                        >
                                            <iframe
                                                key={company.address}
                                                title="Company location map"
                                                src={mapEmbedSrc}
                                                className="w-full h-full pointer-events-none grayscale-[15%]"
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm">
                                                    <MdOpenInFull className="text-slate-700 text-sm" />
                                                </div>
                                            </div>

                                            {/* Go directly to pinned location */}
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute bottom-1.5 right-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm hover:bg-white transition-colors"
                                                aria-label="Open location in Google Maps"
                                            >
                                                <MdLocationOn className="text-[#289800] text-sm" />
                                            </a>
                                        </button>
                                    )}

                                    {/* Address */}
                                    <div className="flex items-start gap-4">
                                        <div className="size-8 md:size-9 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                                            <MdLocationOn className="text-[#289800] text-lg md:text-xl" />
                                        </div>
                                        <div className="pt-0.5 flex-1 min-w-0">
                                            <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Address</div>
                                            {isEditMode ? (
                                                <>
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editAddress}
                                                        onChange={(e) => {
                                                            setEditAddress(e.target.value);
                                                            if (errors.address) setErrors((prev) => ({ ...prev, address: false }));
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveEdit();
                                                            if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                        disabled={isSaving}
                                                        placeholder="Enter address"
                                                        aria-invalid={errors.address}
                                                        className={`w-full text-[13px] md:text-[14px] font-medium text-slate-800 border rounded-md px-2 py-1 outline-none focus:ring-0 disabled:opacity-60 ${errors.address ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#289800]'}`}
                                                    />
                                                    {errors.address && (
                                                        <p className="text-[11px] text-red-500 font-medium mt-1">Address is required.</p>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-[13px] md:text-[14px] font-medium text-slate-800 leading-tight">
                                                    {company.address || 'Not provided'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Branch */}
                                    <div className="flex items-start gap-4">
                                        <div className="size-8 md:size-9 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                                            <MdBusiness className="text-[#289800] text-lg md:text-xl" />
                                        </div>
                                        <div className="pt-0.5">
                                            <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Branch</div>
                                            <div className="text-[13px] md:text-[14px] font-medium text-slate-800 leading-tight">
                                              {company.main_location || 'Not provided'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Number */}
                                    <div className="flex items-start gap-4">
                                        <div className="size-8 md:size-9 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                                            <MdPhone className="text-[#289800] text-lg md:text-xl" />
                                        </div>
                                        <div className="pt-0.5 flex-1 min-w-0">
                                            <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Contact Number</div>
                                            {isEditMode ? (
                                                <>
                                                    <input
                                                        type="tel"
                                                        value={editContact}
                                                        onChange={(e) => {
                                                            setEditContact(e.target.value);
                                                            if (errors.contact) setErrors((prev) => ({ ...prev, contact: false }));
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveEdit();
                                                            if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                        disabled={isSaving}
                                                        placeholder="Enter contact number"
                                                        aria-invalid={errors.contact}
                                                        className={`w-full text-[13px] md:text-[14px] font-medium text-slate-800 border rounded-md px-2 py-1 outline-none focus:ring-0 disabled:opacity-60 ${errors.contact ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#289800]'}`}
                                                    />
                                                    {errors.contact && (
                                                        <p className="text-[11px] text-red-500 font-medium mt-1">Contact number is required.</p>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-[13px] md:text-[14px] font-medium text-slate-800 leading-tight">
                                                    {company.contact_no || 'Not Provided'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Branches Card */}
                            <div className="mt-2.5 md:mt-4 border border-[#00000010] border-b-black/20 border-r-black/20 shadow-sm md:shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)] rounded-2xl bg-[#F2FAEE] backdrop-blur-sm overflow-hidden pb-5">
                                <div className="px-5 py-4 bg-[#F2FAEE] flex justify-between items-center">
                                    <h3 className="text-[10px] md:text-[11px] font-bold text-slate-600 tracking-wide uppercase">Branches</h3>
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
                                                className="flex items-center gap-2 bg-[#F6F7F8] shadow-inner border border-gray-300 px-3 py-1.5 rounded-md text-xs md:text-[13px] font-medium text-slate-700"
                                            >
                                                <div className="size-1.5 rounded-full bg-[#195c00]"></div>
                                                {typeof branch === 'object' ? (branch.name || branch.branch_name || JSON.stringify(branch)) : branch}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-2 bg-[#F6F7F8] shadow-inner border border-gray-300 px-3 py-1.5 rounded-md text-xs md:text-[13px] font-medium text-slate-400 italic">
                                            <div className="size-1.5 rounded-full bg-slate-300"></div>
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
            </div>

            {/* Expanded Map Modal - centered overlay */}
            {isMapExpanded && mapEmbedSrc && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm"
                    onClick={() => setIsMapExpanded(false)}
                >
                    <div
                        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                                    <MdOutlineMap className="text-[#289800] text-lg" />
                                </div>
                                <div>
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Location</div>
                                    <div className="text-sm font-semibold text-slate-800 leading-tight">
                                        {company?.address || 'Not provided'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMapExpanded(false)}
                                className="text-slate-500 hover:text-slate-800 transition-colors p-1"
                                aria-label="Close map"
                            >
                                <MdClose size={20} />
                            </button>
                        </div>

                        <iframe
                            title="Company location map expanded"
                            src={mapEmbedSrc}
                            className="w-full h-[50vh] md:h-[500px]"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />

                        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company?.address || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-[#195c00] hover:underline"
                            >
                                Open in Google Maps →
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Unsaved Changes Confirmation Popup - shown when closing while editing */}
            {showCloseConfirm && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowCloseConfirm(false)}
                >
                    <div
                        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={discardAndClose}
                            disabled={isSaving}
                            title="Discard & Close"
                            className="absolute right-6 text-xl font-semibold text-red-600 hover:text-red-900 transition-colors disabled:opacity-60"
                        >
                            <MdClose />
                        </button>

                        <div className="flex flex-col items-center">
                            <span className="pt-6 p-3"><IoWarningOutline className="size-8"/></span>
                            <h3 className="text-sm text-center font-bold text-slate-800 mb-1.5">Unsaved changes</h3>
                            <p className="text-[13px] text-center text-slate-500 leading-snug my-2">
                                You're still editing this company's details. Save your changes before closing, or discard them.
                            </p>
                            {(errors.address || errors.contact) && (
                                <div className="mt-2 mb-3 rounded-md bg-red-50 border text-center w-full border-red-200 px-3 py-2">
                                    {errors.address && (
                                        <p className="text-[12px] text-red-600 font-medium">Address is required.</p>
                                    )}
                                    {errors.contact && (
                                        <p className="text-[12px] text-red-600 font-medium">Contact number is required.</p>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-row w-full gap-2 mt-3.5 mb-2">
                            <button
                                type="button"
                                onClick={() => setShowCloseConfirm(false)}
                                disabled={isSaving}
                                className="flex-1 text-xs font-semibold px-3.5 py-2 rounded-md border border-slate-400 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-60"
                            >
                                Keep Editing
                            </button>
                            
                            <button
                                type="button"
                                onClick={saveAndCloseFromWarning}
                                disabled={isSaving}
                                className="flex-1 text-xs font-semibold px-3.5 py-2 rounded-md bg-[#195c00] text-white hover:bg-[#0f3800] transition-colors disabled:opacity-60"
                            >
                                Save &amp; Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}