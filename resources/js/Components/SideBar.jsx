import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { GoSidebarExpand, GoSidebarCollapse } from "react-icons/go";
import { FaRegUserCircle, FaUserCircle } from "react-icons/fa";
import { RiSettingsLine, RiSettingsFill } from "react-icons/ri";
import { IoMdArrowDropdown } from "react-icons/io";


export default function Sidebar() {
  const { url } = usePage();
  const [isOpen, setIsOpen] = useState(true);
  const [activeModule, setActiveModule] = useState(null);
  const [activeSubMenu, setActiveSubMenu] = useState(null);
  const [activeMachineSubMenu, setActiveMachineSubMenu] = useState(null);
  const [activeServiceSubMenu, setActiveServiceSubMenu] = useState(null);
  const [activeDeliverySubMenu, setActiveDeliverySubMenu] = useState(null);

  const [activeItem, setActiveItem] = useState(null); // "profile" | "settings" | null

  const toggleSidebar = () => setIsOpen(!isOpen);

  const closeAllMenus = () => {
    setActiveModule(null);
    setActiveSubMenu(null);
    setActiveMachineSubMenu(null);
    setActiveServiceSubMenu(null);
    setActiveDeliverySubMenu(null);
  };

  const handleModuleToggle = (moduleName) => {
    setActiveModule(activeModule === moduleName ? null : moduleName);
    setActiveSubMenu(null);
    setActiveMachineSubMenu(null);
    setActiveServiceSubMenu(null);
    setActiveDeliverySubMenu(null);
  };

  const handleSubToggle = (subMenuName) => {
    setActiveSubMenu(activeSubMenu === subMenuName ? null : subMenuName);
  };

  const handleMachineSubToggle = (name) => {
    setActiveMachineSubMenu(activeMachineSubMenu === name ? null : name);
  };

  const handleServiceSubToggle = (name) => {
    setActiveServiceSubMenu(activeServiceSubMenu === name ? null : name);
  };

  const handleDeliverySubToggle = (name) => {
    setActiveDeliverySubMenu(activeDeliverySubMenu === name ? null : name);
  };

  const NavSubLink = ({ href, active, children }) => (
    <Link
      href={href}
      className={`block pl-6 py-1.5 text-sm ${active  ? 'text-darkgreen font-semibold ml-2 border-darkgreen/70 border-l bg-[#B5EBA2] w-[85%]' : 'text-darkgreen/70 ml-2 border-l border-[#90E274]'}`}
    >
      {children}
    </Link>
  );

  // ACTIVE (highlight) is route-based, independent from EXPANDED (activeModule)
   const activeByRoute =
        route().current('customers.*') || route().current('roi.*')
            ? 'customer'
            : route().current('machine.*')
            ? 'machine'
            : route().current('service.*')
            ? 'service'
            : route().current('delivery.*')
            ? 'delivery'
            : null;

const isCustomerActive = activeByRoute === 'customer';
const isMachineActive = activeByRoute === 'machine';
const isServiceActive = activeByRoute === 'service';
const isDeliveryActive = activeByRoute === 'delivery';

const customerExpanded = isOpen && activeModule === 'customer';
const machineExpanded  = isOpen && activeModule === 'machine';
const serviceExpanded  = isOpen && activeModule === 'service';
const deliveryExpanded = isOpen && activeModule === 'delivery';


  // Text reveal/hide WITHOUT moving icons
  const labelClass = `overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-in-out ${isOpen ? "max-w-[240px] opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-1"}`;

  // Reserve space for chevron so row doesn’t shift
  const chevronSlotClass = `flex items-center justify-end w-12 transition-opacity duration-300 ease-in-out ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`;

  return (
    <aside className={`h-screen flex flex-col bg-white shadow-xl border-r overflow-hidden transition-[width] duration-300 ease-in-out ${isOpen ? "w-80" : "w-20"}`}>
        {/* HEADER (stable: grid prevents shifting) */}
        <div className={`p-4 flex items-center ${isOpen ? "justify-between" : "justify-center"}`}>

            {/* Center logo area */}
            {isOpen ? ( <img src="/images/logo.png" alt="CRM Logo" className="pl-1 h-16 w-auto"/>
                ) : (
                    <button onClick={toggleSidebar} className="group absolute h-14 w-10 flex items-center justify-center rounded-md">
                        <img src="/images/logoSmall.png" alt="CRM Logo" className="absolute object-contain opacity-100 group-hover:opacity-0 transition-opacity duration-200"/>
                        <GoSidebarExpand className="absolute w-6 h-6 text-darkgreen opacity-0 group-hover:opacity-100 transition-opacity duration-200" aria-hidden="true"/>
                    </button>
            )}

            {/* Right side: collapse button (slot reserved when closed) */}
            <div className=" w-12 flex justify-end">
                {isOpen ? (
                    <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-gray-200 transition" aria-label="Collapse sidebar">
                        <GoSidebarCollapse className="w-6 h-6 text-darkgreen" />
                    </button>
                ) : (
                    <div className="w-10 h-16" />
                )}
            </div>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar">
            {/* CUSTOMER MANAGEMENT */}
            <div className="space-y-3 mx-2">
            <div>
                <div className={`group ${isCustomerActive ? 'bg-lightgreen shadow-lg' : 'hover:bg-lightgreen'} ${customerExpanded ? 'rounded-t-xl' : 'rounded-xl'}`}>
                    <div className={`flex items-center px-3 py-3`}>
                        <Link
                            href={route('customers.dashboard')}
                            onClick={() => handleModuleToggle('customer')}
                            className={`flex items-center flex-1 min-w-0 hover:text-black transition-colors ${isCustomerActive ? 'text-black' : 'text-darkgreen'}`}
                        >
                            {/* ICON (fixed slot) */}
                            <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors ${activeModule === 'customer' ? 'bg-white/0' : 'group-hover:bg-green-100'}`}>
                                <img src="/icons/customer.png" alt="Customer Account Management" />
                            </div>

                            {/* LABEL (reveal/hide only) */}
                            <span className={`ml-4 text-lg tracking-wide font-semibold ${labelClass}`}>
                                Customer Account <br /> Management
                            </span>
                        </Link>

                        {/* Chevron slot (reserved width so no shifting) */}
                        <div className={chevronSlotClass}>
                            <button onClick={() => handleModuleToggle('customer')} className="p-2" aria-label="Toggle customer menu">
                                <span className={`inline-block transition-transform duration-300 ${activeModule === 'customer' ? 'rotate-180' : ''}`}>
                                    <IoMdArrowDropdown color="black" size={18} />
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* CUSTOMER SUB-ITEMS */}
                {isOpen && activeModule === 'customer' && (
                    <div className="bg-lightgreen/50 rounded-b-xl pt-2 pl-8 shadow-lg mb-7">
                        {!activeSubMenu && (
                            <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 hover:text-darkgreen hover:font-medium opacity-80">
                            Customer Information Details
                            </Link>
                        )}

                        {(activeSubMenu === null || activeSubMenu === 'roi') && (
                            <div className="relative">
                                <div className="flex items-center -mt-3 -mb-3 py-2">
                                    <Link href={route('roi.current')} onClick={() => handleSubToggle('roi')} className={`flex-1 px-8 text-sm tracking-tight hover:text-darkgreen hover:font-medium transition-opacity ${activeSubMenu === 'roi' ? 'text-darkgreen/85 font-semibold pt-3 mb-2' : 'text-darkgreen/70 opacity-80'}`}>
                                        Project ROI Approval
                                    </Link>
                                    <button onClick={() => handleSubToggle('roi')} className="px-6 py-2">
                                        <span className={`inline-block transition-transform duration-300 ${activeSubMenu === 'roi' ? 'rotate-180' : ''}`}>
                                            <IoMdArrowDropdown size={14} color={activeSubMenu === 'roi' ? '#15803d' : 'black'} />
                                        </span>
                                    </button>
                                </div>

                                {activeSubMenu === 'roi' && (
                                    <div className="relative ml-8 pb-2 mt-2">
                                    <NavSubLink href={route('roi.current')} active={route().current('roi.current')}>Current</NavSubLink>
                                    <NavSubLink href={route('roi.archive')} active={route().current('roi.archive')}>Archive</NavSubLink>
                                    <NavSubLink href={route('roi.entry')} active={route().current('roi.entry')}>Entry</NavSubLink>
                                    </div>
                                )}
                            </div>
                        )}

                        {!activeSubMenu && (
                            <>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Proposal Generation</Link>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Sales Activities Log</Link>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Contract Generation</Link>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Client Leads & Alerts</Link>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Machine Reservation</Link>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Machine Request</Link>
                            </>
                        )}

                        {(activeSubMenu === null || activeSubMenu === 'reports') && (
                            <div className="relative">
                                <div className="flex items-center -mt-3 -mb-3 py-2">
                                    <Link href={route('roi.current')} onClick={() => handleSubToggle('reports')} className={`flex-1 px-8 py-2 text-sm tracking-tight transition-opacity hover:text-darkgreen hover:font-medium ${activeSubMenu === 'reports' ? 'text-darkgreen/85 font-semibold' : 'text-darkgreen/70 opacity-80'}`}>
                                        Reports/View Only
                                    </Link>
                                    <button onClick={() => handleSubToggle('reports')} className="px-6 py-2">
                                        <span className={`inline-block transition-transform duration-300 ${activeSubMenu === 'reports' ? 'rotate-180' : ''}`}>
                                            <IoMdArrowDropdown size={14} color={activeSubMenu === 'reports' ? '#15803d' : 'black'} />
                                        </span>
                                    </button>
                                </div>

                                {activeSubMenu === 'reports' && (
                                    <div className="relative ml-8 pb-2">
                                        <NavSubLink href={route('roi.current')} active={route().current('roi.current')}>Stocks Inventory (BN/RF)</NavSubLink>
                                        <NavSubLink href={route('roi.archive')} active={route().current('roi.archive')}>Sales Transaction per AM</NavSubLink>
                                        <NavSubLink href={route('roi.entry')} active={route().current('roi.entry')}>Sales Summary Report <br />MTD/YTD</NavSubLink>
                                        <NavSubLink href={route('roi.current')} active={route().current('roi.current')}>All Reports of Others <br /> Systems</NavSubLink>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

                {/* OTHER NAV*/}
                

                    {/* MACHINE INVENTORY */}
                    <div>
                        <div className={`mx-0 group ${activeModule === 'machine' ? 'bg-lightgreen shadow-lg rounded-t-xl' : 'hover:bg-lightgreen rounded-xl'}`}>
                            <div className="flex items-center px-3 py-3">
                                <Link
                                    href="#"
                                    onClick={() => handleModuleToggle('machine')}
                                    className={`flex items-center flex-1 min-w-0 hover:text-black transition-colors ${activeModule === 'machine' ? 'text-black' : 'text-darkgreen'}`}
                                >
                                    <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors group-hover:bg-green-100">
                                        <img src="/icons/machine.png" alt="Machine Inventory Management" />
                                    </div>

                                    <span className={`ml-4 text-lg tracking-wide font-semibold ${labelClass}`}>
                                        Machine Inventory <br /> Management
                                    </span>
                                </Link>

                                <div className={chevronSlotClass}>
                                    <button onClick={() => handleModuleToggle('machine')} className="p-2" aria-label="Toggle machine menu">
                                        <span className={`inline-block transition-transform duration-300 ${activeModule === 'machine' ? 'rotate-180' : ''}`}>
                                            <IoMdArrowDropdown color="black" size={18} />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* MACHINE INVENTORY SUB-ITEMS */}
                        {isOpen && activeModule === 'machine' && (
                            <div className="bg-lightgreen/50 rounded-b-xl mx-0 pt-2 pb-2 pl-8 shadow-lg mb-3">

                                {/* 1) Machine In-Field Inventory (with sublinks) */}
                                {(activeMachineSubMenu === null || activeMachineSubMenu === 'infield') && (
                                    <div className="relative">
                                        <div className="flex items-center -mt-3 py-2 pb-2 pt-5">
                                            <Link href="#" onClick={() => handleMachineSubToggle('infield')} className={`flex-1 px-8 text-sm tracking-tight hover:text-darkgreen hover:font-medium transition-opacity ${ activeMachineSubMenu === 'infield' ? 'text-darkgreen/85 font-semibold ' : 'text-darkgreen/70 opacity-80'}`}
                                            >
                                                Machine In-Field Inventory
                                            </Link>

                                            <button onClick={() => handleMachineSubToggle('infield')} className="px-6 py-2">
                                                <span className={`inline-block transition-transform duration-300 ${activeMachineSubMenu === 'infield' ? 'rotate-180' : ''}`}>
                                                    <IoMdArrowDropdown size={14} color={activeMachineSubMenu === 'infield' ? '#15803d' : 'black'} />
                                                </span>
                                            </button>
                                        </div>

                                        {activeMachineSubMenu === 'infield' && (
                                            <div className="relative ml-8 pb-2">
                                                <NavSubLink href="#" active={false}>per Company/AM/Branch</NavSubLink>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 2-8) Normal links (ONLY show when no submenu is open) */}
                                {!activeMachineSubMenu && (
                                <>
                                    <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Preventive Maintenance</Link>
                                    <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Machine Pull Out</Link>
                                    <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Meter Reading</Link>
                                    <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Parts Requisition</Link>
                                    <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Machine Reservation</Link>
                                    <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Machine Request</Link>
                                </>
                                )}

                                {/* 9) Inventory Machine (View Only) (with sublinks) */}
                                {(activeMachineSubMenu === null || activeMachineSubMenu === 'inventory_view') && (
                                    <div className="relative">
                                        <div className="flex items-center py-1">
                                            <Link href="#" onClick={() => handleMachineSubToggle('inventory_view')} className={`flex-1 px-8 text-sm tracking-tight hover:text-darkgreen hover:font-medium transition-opacity ${ activeMachineSubMenu === 'inventory_view' ? 'text-darkgreen/85 font-semibold pb-2 pt-1' : 'text-darkgreen/70 opacity-80'}`}
                                            >
                                                Inventory Machine <br /> (View Only)
                                            </Link>

                                            <button onClick={() => handleMachineSubToggle('inventory_view')} className="px-6 py-2">
                                                <span className={`inline-block transition-transform duration-300 ${activeMachineSubMenu === 'inventory_view' ? 'rotate-180' : ''}`}>
                                                    <IoMdArrowDropdown size={14} color={activeMachineSubMenu === 'inventory_view' ? '#15803d' : 'black'} />
                                                </span>
                                            </button>
                                        </div>

                                        {activeMachineSubMenu === 'inventory_view' && (
                                            <div className="relative ml-8 pb-1">
                                                <NavSubLink href="#" active={false}>Brand New Machine</NavSubLink>
                                                <NavSubLink href="#" active={false}>Refurbish Machine</NavSubLink>
                                                <NavSubLink href="#" active={false}>Returned Machine</NavSubLink>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 10) Reports (ONLY show when no submenu is open) */}
                                {!activeMachineSubMenu && (
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">
                                    Reports
                                </Link>
                                )}
                            </div>
                        )}


                    </div>


                    {/* SERVICE SUPPORT */}
                    <div>
                        <div className={`mx-0 group ${ activeModule === 'service' ? 'bg-lightgreen shadow-lg rounded-t-xl' : 'hover:bg-lightgreen rounded-xl'}`}>
                            <div className="flex items-center px-3 py-3">
                                <Link
                                    href="#"
                                    onClick={() => handleModuleToggle('service')}
                                    className={`flex items-center flex-1 min-w-0 hover:text-black transition-colors ${ activeModule === 'service' ? 'text-black' : 'text-darkgreen'}`}
                                >
                                    <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors group-hover:bg-green-100">
                                        <img src="/icons/service.png" alt="Service Support Management" />
                                    </div>

                                    <span className={`ml-4 text-lg tracking-wide font-semibold ${labelClass}`}>
                                        Service Support <br /> Management
                                    </span>
                                </Link>

                                <div className={chevronSlotClass}>
                                    <button onClick={() => handleModuleToggle('service')} className="p-2" aria-label="Toggle service menu">
                                        <span className={`inline-block transition-transform duration-300 ${activeModule === 'service' ? 'rotate-180' : ''}`}>
                                            <IoMdArrowDropdown color="black" size={18} />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {isOpen && activeModule === 'service' && (
                          <div className="bg-lightgreen/50 rounded-b-xl mx-0 pt-2 pb-2 pl-8 shadow-lg mb-3">

                            {/* 1) Service Ticketing (with sublinks) */}
                            {(activeServiceSubMenu === null || activeServiceSubMenu === 'ticketing') && (
                                <div className="relative">
                                    <div className="flex items-center -mt-3 -mb-3 pb-3 py-3">
                                        <Link
                                            href="#"
                                            onClick={() => handleServiceSubToggle('ticketing')}
                                            className={`flex-1 px-8 text-sm tracking-tight hover:text-darkgreen hover:font-medium transition-opacity ${
                                            activeServiceSubMenu === 'ticketing' ? 'text-darkgreen/85 font-semibold pt-1 mb-1' : 'text-darkgreen/70 opacity-80'
                                            }`}
                                        >
                                            Service Ticketing
                                        </Link>

                                        <button onClick={() => handleServiceSubToggle('ticketing')} className="px-6 py-2">
                                            <span className={`inline-block transition-transform duration-300 ${activeServiceSubMenu === 'ticketing' ? 'rotate-180' : ''}`}>
                                                <IoMdArrowDropdown size={14} color={activeServiceSubMenu === 'ticketing' ? '#15803d' : 'black'} />
                                            </span>
                                        </button>
                                    </div>

                                    {activeServiceSubMenu === 'ticketing' && (
                                        <div className="relative ml-8 pb-1">
                                            <NavSubLink href="#" active={false}>Service Dispatch Web Portal</NavSubLink>
                                            <NavSubLink href="#" active={false}>Field Tech Web Portal</NavSubLink>
                                            <NavSubLink href="#" active={false}>Client Direct Web Portal</NavSubLink>
                                            <NavSubLink href="#" active={false}>Website Support Portal</NavSubLink>
                                        </div>
                                    )}
                              </div>
                            )}

                            {/* Rest of the normal links (ONLY show when no submenu is open) */}
                            {!activeServiceSubMenu && (
                              <>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Parts Requisition (BN/RF)</Link>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Reports</Link>
                              </>
                            )}
                          </div>
                        )}

                    </div>


                    {/* DELIVERY LOGISTICS */}
                    <div>
                        <div className={`mx-0 group ${ activeModule === 'delivery' ? 'bg-lightgreen shadow-lg rounded-t-xl' : 'hover:bg-lightgreen rounded-xl'}`}>
                            <div className="flex items-center px-3 py-3">
                                <Link
                                    href="#"
                                    onClick={() => handleModuleToggle('delivery')}
                                    className={`flex items-center flex-1 min-w-0 hover:text-black transition-colors ${ activeModule === 'delivery' ? 'text-black' : 'text-darkgreen'}`}
                                >
                                    <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors group-hover:bg-green-100">
                                        <img src="/icons/delivery.png" alt="Delivery Logistics Management" />
                                    </div>

                                    <span className={`ml-4 text-lg tracking-wide font-semibold ${labelClass}`}>
                                        Delivery Logistics <br /> Management
                                    </span>
                                </Link>

                                <div className={chevronSlotClass}>
                                    <button onClick={() => handleModuleToggle('delivery')} className="p-2" aria-label="Toggle delivery menu">
                                        <span className={`inline-block transition-transform duration-300 ${activeModule === 'delivery' ? 'rotate-180' : ''}`}>
                                            <IoMdArrowDropdown color="black" size={18} />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {isOpen && activeModule === 'delivery' && (
                          <div className="bg-lightgreen/50 rounded-b-xl mx-0 pt-4 pb-2 pl-8 shadow-lg mb-3">

                            {/* 1) Order & Delivery Management (with sublinks) */}
                            {(activeDeliverySubMenu === null || activeDeliverySubMenu === 'order_delivery') && (
                              <div className="relative">
                                <div className="flex items-center -mt-3 -mb-3 py-3">
                                  <Link
                                    href="#"
                                    onClick={() => handleDeliverySubToggle('order_delivery')}
                                    className={`flex-1 px-8 text-sm tracking-tight hover:text-darkgreen hover:font-medium transition-opacity ${
                                      activeDeliverySubMenu === 'order_delivery'
                                        ? 'text-darkgreen/85 font-semibold'
                                        : 'text-darkgreen/70 opacity-80'
                                    }`}
                                  >
                                    Order & Delivery Management
                                  </Link>

                                  <button onClick={() => handleDeliverySubToggle('order_delivery')} className="px-6 py-2">
                                    <span className={`inline-block transition-transform duration-300 ${activeDeliverySubMenu === 'order_delivery' ? 'rotate-180' : ''}`}>
                                      <IoMdArrowDropdown size={14} color={activeDeliverySubMenu === 'order_delivery' ? '#15803d' : 'black'} />
                                    </span>
                                  </button>
                                </div>

                                {activeDeliverySubMenu === 'order_delivery' && (
                                  <div className="relative ml-8 pb-1 mt-2">
                                    <NavSubLink href="#" active={false}>Auto Email Status <br /> Notification</NavSubLink>
                                    <NavSubLink href="#" active={false}>Delivery Assignment</NavSubLink>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 2) Vehicle Tracking (with sublinks) */}
                            {(activeDeliverySubMenu === null || activeDeliverySubMenu === 'vehicle_tracking') && (
                              <div className="relative">
                                <div className="flex items-center -mt-3 -mb-3 pb-1 py-2">
                                  <Link
                                    href="#"
                                    onClick={() => handleDeliverySubToggle('vehicle_tracking')}
                                    className={`flex-1 px-8 text-sm tracking-tight hover:text-darkgreen hover:font-medium transition-opacity ${
                                      activeDeliverySubMenu === 'vehicle_tracking'
                                        ? 'text-darkgreen/85 font-semibold mb-2'
                                        : 'text-darkgreen/70 opacity-80'
                                    }`}
                                  >
                                    Vehicle Tracking
                                  </Link>

                                  <button onClick={() => handleDeliverySubToggle('vehicle_tracking')} className="px-6 py-2">
                                    <span className={`inline-block transition-transform duration-300 ${activeDeliverySubMenu === 'vehicle_tracking' ? 'rotate-180' : ''}`}>
                                      <IoMdArrowDropdown size={14} color={activeDeliverySubMenu === 'vehicle_tracking' ? '#15803d' : 'black'} />
                                    </span>
                                  </button>
                                </div>

                                {activeDeliverySubMenu === 'vehicle_tracking' && (
                                  <div className="relative ml-8 pb-1 mt-1">
                                    <NavSubLink href="#" active={false}>GPS Monitoring <br />(Manila GPS)</NavSubLink>
                                    <NavSubLink href="#" active={false}>Dash Camera Monitoring</NavSubLink>
                                    <NavSubLink href="#" active={false}>Gas Consumption <br /> Monitoring</NavSubLink>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 3) Driver Tracking (with sublinks) */}
                            {(activeDeliverySubMenu === null || activeDeliverySubMenu === 'driver_tracking') && (
                              <div className="relative">
                                <div className="flex items-center -mt-3 -mb-3 pb-3 py-2">
                                  <Link
                                    href="#"
                                    onClick={() => handleDeliverySubToggle('driver_tracking')}
                                    className={`flex-1 px-8 text-sm tracking-tight hover:text-darkgreen hover:font-medium transition-opacity ${
                                      activeDeliverySubMenu === 'driver_tracking'
                                        ? 'text-darkgreen/85 font-semibold mb-1'
                                        : 'text-darkgreen/70 opacity-80'
                                    }`}
                                  >
                                    Driver Tracking
                                  </Link>

                                  <button onClick={() => handleDeliverySubToggle('driver_tracking')} className="px-6 py-2 pt-1">
                                    <span className={`inline-block transition-transform duration-300 ${activeDeliverySubMenu === 'driver_tracking' ? 'rotate-180' : ''}`}>
                                      <IoMdArrowDropdown size={14} color={activeDeliverySubMenu === 'driver_tracking' ? '#15803d' : 'black'} />
                                    </span>
                                  </button>
                                </div>

                                {activeDeliverySubMenu === 'driver_tracking' && (
                                  <div className="relative ml-8">
                                    <NavSubLink href="#" active={false}>Tab/Phone Delivery Receipt</NavSubLink>
                                    <NavSubLink href="#" active={false}>Tab/Phone Geolocation</NavSubLink>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* then the rest of the normal links (ONLY show when no submenu is open) */}
                            {!activeDeliverySubMenu && (
                              <>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Vehicle Maintenance</Link>
                                <Link href="#" className="block px-8 py-2 text-sm text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium">Reports</Link>
                              </>
                            )}
                          </div>
                        )}

                    </div>

                </div>
        </nav>

        {/* Footer (fixed position, no shifting) */}
        <div className="relative p-4 ml-2 flex flex-col gap-4 items-start">
            <div className="relative">
                <button onClick={() => setActiveItem(activeItem === "profile" ? null : "profile")} className="text-darkgreen pl-[2px] transition" aria-label="Profile">
                    {activeItem === "profile" ? <FaUserCircle className="w-7 h-7" /> : <FaRegUserCircle className="w-7 h-7" />}
                </button>

                {isOpen && activeItem === "profile" && (
                    <div className="absolute left-12 bottom-0 w-28 bg-lightgreen/50 shadow-lg rounded-xl border z-50">
                        <Link href={route('profile.edit')}
                            className="block w-full text-left px-4 py-3 text-sm rounded-t-xl font-semibold border-b text-darkgreen border-black/10 hover:bg-green/70"
                            onClick={() => setActiveItem(null)} // close dropdown after click
                        >
                            Edit Profile
                        </Link>
                        <Link href={route('logout')} method="post" as="button"
                            className="w-full text-left px-4 py-3 text-sm rounded-b-xl font-semibold hover:bg-green/70 text-red-600"
                            onClick={() => setActiveItem(null)} // close dropdown
                            >
                            Logout
                        </Link>

                    </div>
                )}
            </div>

            <button onClick={() => setActiveItem(activeItem === "settings" ? null : "settings")} className="text-darkgreen transition" aria-label="Settings">
                {activeItem === "settings" ? <RiSettingsFill className="w-8 h-8" /> : <RiSettingsLine className="w-8 h-8" />}
            </button>
        </div>
    </aside>
  );
}
