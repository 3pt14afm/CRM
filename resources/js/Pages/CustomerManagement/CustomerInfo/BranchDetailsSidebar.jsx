import React, { useEffect, useState, useRef } from 'react';
import { MdClose, MdLocationOn, MdPhone, MdOutlineMap, MdBusiness } from 'react-icons/md';
import { createPortal } from 'react-dom';

export default function BranchDetailsSidebar({ isOpen, locationGroup, onClose, rightOffset = 0, onPanelRectChange }) {
    const [isDesktop, setIsDesktop] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 640px)');
        const update = () => setIsDesktop(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (!isOpen || !isDesktop) {
            onPanelRectChange?.(null);
            return;
        }
        const report = () => {
            if (!panelRef.current) return;
            const rect = panelRef.current.getBoundingClientRect();
            onPanelRectChange?.({ top: rect.top, bottom: rect.bottom, right: rect.right });
        };
        // wait for the slide-in transition to settle before measuring
        const timeout = setTimeout(report, 520);
        window.addEventListener('resize', report);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', report);
        };
    }, [isOpen, isDesktop, rightOffset, onPanelRectChange]);

    const getMapEmbedSrc = (address, zoom = 15) => {
        if (!address) return null;
        return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom}&output=embed`;
    };

    function LazyAddressMap({ address, getMapEmbedSrc }) {
        const containerRef = useRef(null);
        const [isVisible, setIsVisible] = useState(false);

        useEffect(() => {
            const el = containerRef.current;
            if (!el || isVisible) return;

            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        setIsVisible(true);
                        observer.disconnect();
                    }
                },
                { root: null, rootMargin: '150px', threshold: 0.01 }
            );
            observer.observe(el);
            return () => observer.disconnect();
        }, [isVisible]);

        const mapSrc = isVisible ? getMapEmbedSrc(address) : null;

        return (
            <div ref={containerRef} className="relative w-full h-28 md:h-32 mb-1 rounded-xl overflow-hidden border border-[#00000010] shadow-sm bg-[#eceeec]">
                {mapSrc ? (
                    <>
                        <iframe
                            title={`Map for ${address}`}
                            src={mapSrc}
                            className="w-full h-full grayscale-[15%]"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                        
                        <a    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-1.5 right-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm hover:bg-white transition-colors"
                            aria-label="Open location in Google Maps"
                        >
                            <MdOutlineMap className="text-[#289800] text-sm" />
                        </a>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[10px] text-slate-400 font-medium">Loading map…</span>
                    </div>
                )}
            </div>
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[45] flex items-end justify-center sm:items-stretch sm:justify-end pointer-events-none">
            <div
                ref={panelRef}
                style={isOpen && isDesktop ? { marginRight: rightOffset } : undefined}
                className={`relative w-full h-[75vh] sm:w-[72%] md:max-w-[440px] sm:my-auto bg-[#f5f5f7]/90 backdrop-blur shadow-[-6px_0_18px_rgba(0,0,0,0.10)] border border-b border-black/15 flex flex-col rounded-t-3xl sm:rounded-3xl transform transition-[transform,margin-right] duration-500 ease-out 
                    ${ isOpen ? 'translate-y-0 sm:translate-x-0 pointer-events-auto' : 'translate-y-full sm:translate-y-0 sm:translate-x-[120%] pointer-events-none' }`}
            >
                {/* Header */}
                <div className="px-4 md:px-6 p-3.5 flex justify-end items-center flex-shrink-0 rounded-t-3xl">
                    <div className="flex-1 text-center pt-1">
                        <h3 className="text-sm md:text-base font-extrabold text-slate-800 leading-tight">
                            Branch Details
                        </h3>
                        <div className="text-[10px] md:text-[11px] font-medium text-slate-500 leading-tight">
                            {locationGroup?.main_location_name || 'Unnamed location'}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-800 transition-colors p-1"
                        aria-label="Close location details"
                    >
                        <MdClose size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-0 pb-8 [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#195c0059]">
                    {locationGroup ? (
                        <div className="flex flex-col">
                            {/* Location name */}
                            <div className="flex items-start gap-3 mb-3">
                                <span className="shrink-0 mt-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border bg-[#195c00]/10 text-[#195c00] border-[#195c00]/20">
                                    {locationGroup.addresses.length} address{locationGroup.addresses.length !== 1 ? 'es' : ''}
                                </span>
                            </div>

                            {/* Addresses under this location */}
                            <div className="flex flex-col gap-2.5">
                                {locationGroup.addresses.map((addr) => {

                                    return (
                                        <div
                                            key={addr.id}
                                            className="border border-[#00000010] border-b-black/20 border-r-black/20 shadow-sm rounded-2xl bg-[#F2FAEE] backdrop-blur-sm overflow-hidden"
                                        >
                                            <div className="p-4 md:p-5 flex flex-col gap-4">
                                                {/* Company Name */}
                                                <div className="flex justify-center min-w-0 bg-[#ebffe3] p-1.5 px-3 border rounded-2xl shadow-inner">
                                                    <div className="text-[10px] md:text-xs font-bold text-center text-slate-800 leading-tight">
                                                        {addr.company_name || 'Not provided'}
                                                    </div>
                                                </div>

                                                {/* Address */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                        <div className="size-7 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                                                            <MdLocationOn className="text-[#289800] text-base md:text-md" />
                                                        </div>
                                                        <div className="pt-0.5 min-w-0 flex-1">
                                                            <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Address</div>
                                                            <div className="text-[10px] md:text-xs font-medium text-slate-800 leading-tight">
                                                                {addr.address || 'Not provided'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Contact Number */}
                                                <div className="flex items-start gap-3">
                                                    <div className="size-7 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                                                        <MdPhone className="text-[#289800] text-base md:text-md" />
                                                    </div>
                                                    <div className="pt-0.5 flex-1 min-w-0">
                                                        <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Contact Number</div>
                                                        <div className="text-[10px] md:text-xs font-medium text-slate-800 leading-tight">
                                                            {addr.contact_no || 'Not Provided'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Map for this address */}
                                                <LazyAddressMap address={addr.address} getMapEmbedSrc={getMapEmbedSrc} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-slate-400 font-medium text-sm">No location selected</span>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}