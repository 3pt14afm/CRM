import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';

export default function Sidebar() {
    const { url } = usePage();
    const [isOpen, setIsOpen] = useState(true);
    const [activeModule, setActiveModule] = useState(null);
    const [activeSubMenu, setActiveSubMenu] = useState(null);

    const toggleSidebar = () => setIsOpen(!isOpen);

const closeAllMenus = () => {
        setActiveModule(null);
        setActiveSubMenu(null);
    };
    const handleModuleToggle = (moduleName) => {
        setActiveModule(activeModule === moduleName ? null : moduleName);
        setActiveSubMenu(null); 
    };

    const handleSubToggle = (subMenuName) => {
        setActiveSubMenu(activeSubMenu === subMenuName ? null : subMenuName);
    };

    ///mao ni ang code para sa sub-item sa roi
        const NavSubLink = ({ href, active, children }) => (
                <Link 
                    href={href} 
                    className={`block pl-6 py-1.5  text-sm transition-all ${
                        active 
                        ? 'text-green-900  border-[#34b808] border-l-2 bg-[#B5EBA2]  w-[80%]' 
                        : 'text-gray-500  border-l border-[#90E274] '
                    }`}
                >
                    {children}
                </Link>
            );

    return (
        <aside className={`transition-all duration-300 bg-white shadow-xl h-full flex flex-col border-r overflow-hidden ${isOpen ? 'w-96' : 'w-30'}`}>
            
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b bg-gray-50">
                {isOpen && <span className="font-bold text-xl text-green-700 ml-2">CRM System</span>}
                <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-gray-200 text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <nav className="flex-1 py-4 overflow-y-auto">
                
                {/* 1. CUSTOMER MANAGEMENT */}
              <div className="pr-2 mb-1"> {/* Outer wrapper with consistent padding */}
                <div  className={`flex items-center transition-all duration-300 ease-in-out group ${
                        activeModule === 'customer' 
                            ? 'bg-[#B5EBA2] shadow-2xl rounded-t-2xl' 
                            : 'hover:bg-[#B5EBA2] rounded-xl'
                    } ${isOpen ? 'mx-3' : 'mx-0 justify-center'}`}  /* mx-0 and justify-center centers the item when closed */ >
              <Link 
                        href={route('customers.dashboard')} 
                        onClick={closeAllMenus}
                        className={`flex items-center transition-colors hover:text-black ${
                            isOpen ? 'flex-1 px-3 py-2' : 'p-3 justify-center' 
                        } ${activeModule === 'customer' ? 'text-black' : 'text-gray-600'}`}
                    >
                        {/* ICON CONTAINER */}
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors shrink-0 ${
                            activeModule === 'customer' ? 'bg-white/30' : 'bg-gray-100 group-hover:bg-green-100'
                        }`}>
                            <span className="text-xl">🤝</span>
                        </div>
                        
                        {/* TEXT (Only shows if Sidebar is open) */}
                        {isOpen && (
                            <span className={`ml-3 text-[19px] tracking-wide transition-all truncate ${
                                activeModule === 'customer' ? 'tex-black font-semibold' : 'font-semibold'
                            }`}>
                                Customer Account <br></br> Management
                            </span>
                        )}
              </Link>
                        {isOpen && (
                            <button onClick={() => handleModuleToggle('customer')} className="px-6 py-4">
                                <span className={`inline-block transition-transform duration-300 ${activeModule === 'customer' ? 'rotate-180' : ''}`}>
                                    <ChevronDown color="black" size={18} />
                                </span>
                            </button>
                        )}
                    </div>

                    {/* CUSTOMER SUB-ITEMS */}
                    {isOpen && activeModule === 'customer' && (
                        <div className="bg-[#B5EBA2]/40 rounded-b-2xl animate-in slide-in-from-top-1 mx-3 pt-2 shadow-lg mb-10">
                            
                            {/* Hide these if ANY sub-menu (ROI or Reports) is open */}
                            {!activeSubMenu && (
                                <>
                                    <Link href="#" className="block px-8 py-3 text-base  text-gray-700  hover:bg-green-100 opacity-80 transition-all">Customer Information Details</Link>
                                </>
                            )}

                            {/* PROJECT ROI (Focused Section) */}
                            {(activeSubMenu === null || activeSubMenu === 'roi') && (
                              <div className="relative"> {/* 'relative' allows the vertical line to span the height */}
                        <div className={`flex items-center transition-colors -mt-3 -mb-3` }>
                            <Link 
                                href={route('roi.current')} 
                                className={`flex-1 px-8  text-base tracking-tight transition-opacity ${
                                    activeSubMenu === 'roi' ? 'text-green-900  pt-3 mb-2' : 'text-gray-800 opacity-80 '
                                }`}
                            >
                                 Project ROI Approval
                            </Link>
                            <button onClick={() => handleSubToggle('roi')} className="px-6 py-4">
                                <span className={`inline-block transition-transform duration-300 ${activeSubMenu === 'roi' ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={14} color={activeSubMenu === 'roi' ? '#15803d' : 'black'} />
                                </span>
                            </button>
                    </div>

            {activeSubMenu === 'roi' && (
           <div className="relative ml-8 pb-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
    
            <NavSubLink 
                    href={route('roi.current')} 
                    active={route().current('roi.current')}
                >
                    Current
                </NavSubLink>
                
                <NavSubLink 
                    href={route('roi.archive')} 
                     active={route().current('roi.archive')}
                >
                    Archive
                </NavSubLink>

                <NavSubLink 
                    href={route('roi.entry')} 
                     active={route().current('roi.entry')}
                >
                    Entry
                </NavSubLink>
</div>
            )}
</div>
                            )}

                            {/* Hide these if ANY sub-menu is open */}
                            {!activeSubMenu && (
                                <>
                                    <Link href="#" className="block px-8 py-3  text-base  text-gray-700 opacity-80 hover:bg-green-100">Proposal Generation</Link>
                                    <Link href="#" className="block px-8 py-3  text-base  text-gray-700 opacity-80 hover:bg-green-100">Sales Activities Log</Link>
                                    <Link href="#" className="block px-8 py-3  text-base  text-gray-700 opacity-80 hover:bg-green-100">Contract Generation</Link>
                                    <Link href="#" className="block px-8 py-3 text-base   text-gray-700 opacity-80 hover:bg-green-100">Client Leads & Alerts</Link>
                                    <Link href="#" className="block px-8 py-3  text-base text-gray-700 opacity-80 hover:bg-green-100">Machine Reservation</Link>
                                    <Link href="#" className="block px-8 py-3  text-base  text-gray-700 opacity-80 hover:bg-green-100">Machine Request</Link>
                                </>
                            )}

                            {/* REPORTS (Focused Section) */}
                            {(activeSubMenu === null || activeSubMenu === 'reports') && (
                              <div className="relative"> {/* 'relative' allows the vertical line to span the height */}
                        <div className={`flex items-center transition-colors -mt-3 -mb-3` }>
                            <Link 
                                href={route('roi.current')} 
                                className={`flex-1 px-8 py-2 text-base tracking-tight transition-opacity ${
                                    activeSubMenu === 'reports' ? 'text-green-900 font-bold ' : 'text-gray-800 opacity-80 '
                                }`}
                            >
                                 Reports/View Only
                            </Link>
                            <button onClick={() => handleSubToggle('reports')} className="px-6 py-4">
                                <span className={`inline-block transition-transform duration-300 ${activeSubMenu === 'reports' ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={14} color={activeSubMenu === 'roi' ? '#15803d' : 'black'} />
                                </span>
                            </button>
                    </div>

            {activeSubMenu === 'reports' && (
           <div className="relative ml-8 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
    
            <NavSubLink 
                    href={route('roi.current')} 
                    active={route().current('roi.current')}
                >
                    Stocks Inventory (BN/RF)
                </NavSubLink>
                
                <NavSubLink 
                    href={route('roi.archive')} 
                     active={route().current('roi.archive')}
                >
                    Sales Transaction per AM
                </NavSubLink>

                <NavSubLink 
                    href={route('roi.entry')} 
                     active={route().current('roi.entry')}
                >
                    Sales Summary Report MTD/YTD
                </NavSubLink>
                  <NavSubLink 
                    href={route('roi.entry')} 
                     active={route().current('roi.entry')}
                >
                    All Reports of Others Systems
                </NavSubLink>
</div>
            )}
</div>
                            )}
                        </div>
                    )}
                </div>



                {/* OTHER MAIN SECTIONS - Hidden when Customer Management is Open to focus the UI */}
             
                    <div className="space-y-1">
                        <Link href="#" className="flex items-center px-6 py-4 hover:bg-blue-50 font-bold text-gray-700 transition-colors">
                            <span className="text-xl mr-4">🏗️</span>
                            {isOpen && <span>Machine Inventory</span>}
                        </Link>
                        <Link href="#" onClick={closeAllMenus} className="flex items-center px-6 py-4 hover:bg-orange-50 font-bold text-gray-700 transition-colors">
                            <span className="text-xl mr-4">🛠️</span>
                            {isOpen && <span>Service Support</span>}
                        </Link>
                        <Link href="#" onClick={closeAllMenus} className="flex items-center px-6 py-4 hover:bg-purple-50 font-bold text-gray-700 transition-colors">
                            <span className="text-xl mr-4">🚚</span>
                            {isOpen && <span>Delivery Logistics</span>}
                        </Link>
                    </div>
                
            </nav>
        </aside>
    );
}