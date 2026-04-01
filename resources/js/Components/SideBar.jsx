import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GoSidebarExpand, GoSidebarCollapse } from "react-icons/go";
import { FaRegUserCircle, FaUserCircle } from "react-icons/fa";
import { IoMdArrowDropdown, IoIosArrowForward } from "react-icons/io";
import { route } from 'ziggy-js';
import { UserPen, LogOut } from "lucide-react";

export default function Sidebar() {
  const { url } = usePage();
  const [isOpen, setIsOpen] = useState(true);

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const [activeModule, setActiveModule] = useState(null);
  const [activeSubMenu, setActiveSubMenu] = useState(null);
  const [activeMachineSubMenu, setActiveMachineSubMenu] = useState(null);
  const [activeServiceSubMenu, setActiveServiceSubMenu] = useState(null);
  const [activeDeliverySubMenu, setActiveDeliverySubMenu] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  const profileBtnRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const sidebarRef = useRef(null);

  const visitAdmin = (e, href) => {
    e.preventDefault();
    router.visit(href);
  };

  const resetAllSubMenus = () => {
    setActiveSubMenu(null);
    setActiveMachineSubMenu(null);
    setActiveServiceSubMenu(null);
    setActiveDeliverySubMenu(null);
  };

  const closeAllMenus = () => {
    setActiveModule(null);
    resetAllSubMenus();
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

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

  const activeByRoute =
    route().current('customers.*') ||
    route().current('roi.*') ||
    route().current('proposals.*')
      ? 'customer'
      : route().current('machine.*')
      ? 'machine'
      : route().current('service.*')
      ? 'service'
      : route().current('delivery.*')
      ? 'delivery'
      : route().current('admin.*')
      ? 'admin'
      : null;

  const isCustomerActive = activeByRoute === 'customer';
  const isMachineActive = activeByRoute === 'machine';
  const isServiceActive = activeByRoute === 'service';
  const isDeliveryActive = activeByRoute === 'delivery';
  const isAdminActive = activeByRoute === 'admin';

  useEffect(() => {
    if (activeByRoute) {
      setActiveModule(activeByRoute);
    }
  }, [activeByRoute, url]);

  useEffect(() => {
    if (activeItem !== "profile") return;

    const btn = profileBtnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();

    setDropdownPos({
      top: rect.bottom,
      left: rect.right + 12,
    });
  }, [activeItem, isOpen]);

  useEffect(() => {
    if (activeItem !== "profile") return;

    const onMouseDown = (e) => {
      const dropdownEl = dropdownRef.current;
      const btnEl = profileBtnRef.current;

      if (!dropdownEl || !btnEl) return;

      const clickedDropdown = dropdownEl.contains(e.target);
      const clickedButton = btnEl.contains(e.target);

      if (!clickedDropdown && !clickedButton) {
        setActiveItem(null);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [activeItem]);

  const handleRealModuleClick = (e, moduleName, isActive, defaultHref) => {
    e.preventDefault();

    resetAllSubMenus();

    if (!isOpen) {
      setIsOpen(true);
      setActiveModule(moduleName);

      if (isActive) return;

      router.visit(defaultHref);
      return;
    }

    setActiveModule(moduleName);

    if (isActive) return;

    router.visit(defaultHref);
  };

  const handlePlaceholderModuleClick = (e, moduleName) => {
    e.preventDefault();

    resetAllSubMenus();

    if (!isOpen) {
      setIsOpen(true);
      setActiveModule(moduleName);
      return;
    }

    setActiveModule((prev) => (prev === moduleName ? null : moduleName));
  };

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!isOpen) return;

      const sidebarEl = sidebarRef.current;
      const dropdownEl = dropdownRef.current;
      const profileBtnEl = profileBtnRef.current;

      if (sidebarEl && sidebarEl.contains(e.target)) return;
      if (dropdownEl && dropdownEl.contains(e.target)) return;
      if (profileBtnEl && profileBtnEl.contains(e.target)) return;

      setIsOpen(false);
      setActiveItem(null);
      closeAllMenus();
    };

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
    };
  }, [isOpen]);

  const NavSubLink = ({ href, active, children }) => (
    <Link
      href={href}
      className={`block pl-4 py-1 text-xs lg:pl-5 lg:py-1.5 lg:text-xs ${
        active
          ? 'text-darkgreen font-semibold ml-2 border-darkgreen/70 border-l bg-[#B5EBA2] w-[85%]'
          : 'text-darkgreen/70 ml-2 border-l border-[#90E274]'
      }`}
    >
      {children}
    </Link>
  );

  const customerExpanded = isOpen && activeModule === 'customer';
  const machineExpanded = isOpen && activeModule === 'machine';
  const serviceExpanded = isOpen && activeModule === 'service';
  const deliveryExpanded = isOpen && activeModule === 'delivery';
  const adminExpanded = isOpen && activeModule === 'admin';

  const labelClass = `overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-in-out ${
    isOpen ? "max-w-[240px] opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-1"
  }`;

  const chevronSlotClass = `flex items-center justify-end w-12 transition-opacity duration-300 ease-in-out ${
    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
  }`;

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
      className={`relative h-[96.5%] rounded-2xl my-4 bg-white flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isOpen
          ? 'w-[290px] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-10px_-12px_10px_rgba(255,255,255,0.2),-1px_1px_1px_rgba(0,0,0,0.2)] border-r'
          : 'w-16 lg:w-[65px] shadow-[0px_0px_0px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_3px_5px_rgba(0,0,0,0.3)]'
      }`}
    >
      {/* HEADER */}
      <div className={`p-4 flex items-center border-b-black ${isOpen ? "justify-between" : "justify-center"}`}>
        {isOpen ? (
          <img src="/images/logo.webp" alt="CRM Logo" className="pl-1 h-12 w-auto lg:h-16" />
        ) : (
          <button
            onClick={toggleSidebar}
            className="absolute h-14 w-10 flex items-center justify-center rounded-md"
            aria-label="Expand sidebar"
            type="button"
          >
            <img
              src="/images/logoSmall.webp"
              alt="CRM Logo"
              className={`absolute object-contain transition-opacity duration-200 ${
                isSidebarHovered ? "opacity-0" : "opacity-100 h-8 w-auto lg:h-10"
              }`}
            />
            <GoSidebarExpand
              title="Expand sidebar"
              className={`absolute w-4 h-4 lg:w-5 lg:h-5 text-darkgreen transition-opacity duration-200 ${
                isSidebarHovered ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            />
          </button>
        )}

        <div className="w-12 flex justify-end">
          {isOpen ? (
            <button
              onClick={toggleSidebar}
              className="p-2 mt-1 rounded-md hover:bg-gray-200 transition"
              aria-label="Collapse sidebar"
              type="button"
            >
              <GoSidebarCollapse className="w-4 h-4 lg:w-5 lg:h-5 text-darkgreen" />
            </button>
          ) : (
            <div className="w-10 h-12 lg:h-16" />
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-1 mx-2">
          {/* CUSTOMER MANAGEMENT */}
          <div>
            <div className={`group ${isCustomerActive ? 'bg-lightgreen shadow-[0px_0px_2px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_1px_3px_rgba(0,0,0,0.4)]' : 'hover:bg-lightgreen/50'} ${customerExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}>
              <div className="flex items-center px-2 py-2">
                <Link
                  href={route('roi.current')}
                  onClick={(e) =>
                    handleRealModuleClick(
                      e,
                      'customer',
                      isCustomerActive,
                      route('roi.current')
                    )
                  }
                  className={`flex items-center flex-1 min-w-0 hover:text-black transition-colors ${
                    isCustomerActive ? 'text-black' : 'text-darkgreen'
                  }`}
                >
                  <div
                    title="Customer Account Management"
                    className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors lg:w-8 lg:h-8 ${
                      activeModule === 'customer' ? 'bg-white/0' : 'group-hover:bg-green-100'
                    }`}
                  >
                    <img src="/images/cam.webp" alt="Customer Account Management" />
                  </div>

                  <span className={`ml-3 text-xs tracking-wide font-semibold lg:text-sm lg:ml-4 ${labelClass}`}>
                    Customer Account <br /> Management
                  </span>
                </Link>

                <div className={chevronSlotClass}>
                  <button
                    onClick={(e) =>
                      handleRealModuleClick(
                        e,
                        'customer',
                        isCustomerActive,
                        route('roi.current')
                      )
                    }
                    className="p-2"
                    aria-label="Toggle customer menu"
                    type="button"
                  >
                    <span className={`inline-block transition-transform duration-300 ${activeModule === 'customer' ? 'rotate-90' : ''}`}>
                      <IoIosArrowForward color="black" size={14} />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {isOpen && activeModule === 'customer' && (
              <div className="bg-lightgreen/50 rounded-b-lg pt-2 pl-4 shadow-[0px_0px_0px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_2px_5px_rgba(0,0,0,0.3)] mb-7 lg:pl-6">
                {!activeSubMenu && (
                  <Link
                    href="#"
                    className="block px-8 py-2 text-[11px] text-darkgreen/70 hover:text-darkgreen font-medium hover:font-semibold opacity-80 lg:text-xs"
                  >
                    Customer Information Details
                  </Link>
                )}

                {(activeSubMenu === null || activeSubMenu === 'roi') && (
                  <div className="relative">
                    <div className="flex items-center -mt-3 -mb-3 py-2">
                      <Link
                        href={route('roi.current')}
                        onClick={() => handleSubToggle('roi')}
                        className={`flex-1 pl-8 text-[11px] tracking-tight hover:text-darkgreen font-medium hover:font-semibold transition-opacity lg:text-xs ${
                          activeSubMenu === 'roi' ? 'text-darkgreen/85 hover:font-semibold font-semibold pt-3 mb-2' : 'text-darkgreen/70 opacity-80'
                        }`}
                      >
                        Project ROI Approval
                      </Link>
                      <button onClick={() => handleSubToggle('roi')} className="px-6 py-2" type="button">
                        <span className={`inline-block transition-transform duration-300 ${activeSubMenu === 'roi' ? 'rotate-90' : 'opacity-80'}`}>
                          <IoIosArrowForward size={12} color={activeSubMenu === 'roi' ? 'rgba(19, 51, 7, 0.85)' : 'rgba(19, 51, 7, 0.7)'} />
                        </span>
                      </button>
                    </div>

                    {activeSubMenu === 'roi' && (
                      <div className="relative ml-6 pb-2 mt-2">
                        <NavSubLink href={route('roi.current')} active={route().current('roi.current')}>
                          Current
                        </NavSubLink>
                        <NavSubLink href={route('roi.archive')} active={route().current('roi.archive')}>
                          Archive
                        </NavSubLink>
                        <NavSubLink href={route('roi.entry.list')} active={route().current('roi.entry.list')}>
                          Entry
                        </NavSubLink>
                      </div>
                    )}
                  </div>
                )}

                {!activeSubMenu && (
                  <>
                    <Link href={route('proposals.index')} className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Proposal Generation
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Sales Activities Log
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Contract Generation
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Client Leads & Alerts
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Machine Reservation
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Machine Request
                    </Link>
                  </>
                )}

                {(activeSubMenu === null || activeSubMenu === 'reports') && (
                  <div className="relative">
                    <div className="flex items-center -mt-3 -mb-3 py-2">
                      <Link
                        href={route('roi.current')}
                        onClick={() => handleSubToggle('reports')}
                        className={`flex-1 pl-8 py-2 text-[11px] font-medium tracking-tight transition-opacity hover:text-darkgreen hover:font-semibold lg:text-xs ${
                          activeSubMenu === 'reports' ? 'text-darkgreen/85 font-semibold' : 'text-darkgreen/70 opacity-80'
                        }`}
                      >
                        Reports/View Only
                      </Link>
                      <button onClick={() => handleSubToggle('reports')} className="px-6 py-2" type="button">
                        <span className={`inline-block transition-transform duration-300 ${activeSubMenu === 'reports' ? 'rotate-90' : 'opacity-80'}`}>
                          <IoIosArrowForward size={12} color={activeSubMenu === 'reports' ? 'rgba(19, 51, 7, 0.85)' : 'rgba(19, 51, 7, 0.7)'} />
                        </span>
                      </button>
                    </div>

                    {activeSubMenu === 'reports' && (
                      <div className="relative ml-7 pb-2">
                        <NavSubLink href={route('roi.current')} active={route().current('roi.current')}>
                          Stocks Inventory (BN/RF)
                        </NavSubLink>
                        <NavSubLink href={route('roi.archive')} active={route().current('roi.archive')}>
                          Sales Transaction per AM
                        </NavSubLink>
                        <NavSubLink href={route('roi.entry')} active={route().current('roi.entry')}>
                          Sales Summary Report <br /> MTD/YTD
                        </NavSubLink>
                        <NavSubLink href={route('roi.current')} active={route().current('roi.current')}>
                          All Reports of Others <br /> Systems
                        </NavSubLink>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MACHINE INVENTORY */}
          <div>
            <div className={`mx-0 group ${isMachineActive ? 'bg-lightgreen shadow-[0px_0px_2px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_1px_3px_rgba(0,0,0,0.4)]' : 'hover:bg-lightgreen/40'} ${machineExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}>
              <div className="flex items-center px-2 py-2">
                <Link
                  href="#"
                  onClick={(e) => handlePlaceholderModuleClick(e, 'machine')}
                  className={`flex items-center flex-1 min-w-0 hover:text-black transition-colors ${
                    isMachineActive ? 'text-black' : 'text-darkgreen'
                  }`}
                >
                  <div
                    title="Machine Inventory Management"
                    className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors group-hover:bg-green-100 lg:w-8 lg:h-8"
                  >
                    <img src="/images/mim.webp" alt="Machine Inventory Management" />
                  </div>

                  <span className={`ml-3 text-xs tracking-wide font-semibold lg:text-sm lg:ml-4 ${labelClass}`}>
                    Machine Inventory <br /> Management
                  </span>
                </Link>

                <div className={chevronSlotClass}>
                  <button
                    onClick={(e) => handlePlaceholderModuleClick(e, 'machine')}
                    className="p-2"
                    aria-label="Toggle machine menu"
                    type="button"
                  >
                    <span className={`inline-block transition-transform duration-300 ${activeModule === 'machine' ? 'rotate-90' : ''}`}>
                      <IoIosArrowForward color="black" size={14} />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {isOpen && activeModule === 'machine' && (
              <div className="bg-lightgreen/50 rounded-b-lg mx-0 pt-2 pb-2 pl-4 shadow-[0px_0px_0px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_2px_5px_rgba(0,0,0,0.3)] mb-3 lg:pl-6">
                {(activeMachineSubMenu === null || activeMachineSubMenu === 'infield') && (
                  <div className="relative">
                    <div className="flex items-center -mt-3 py-2 pb-1 pt-5">
                      <Link
                        href="#"
                        onClick={() => handleMachineSubToggle('infield')}
                        className={`flex-1 pl-8 text-[11px] tracking-tight hover:text-darkgreen font-medium hover:font-semibold transition-opacity lg:text-xs ${
                          activeMachineSubMenu === 'infield'
                            ? 'text-darkgreen/85 font-semibold '
                            : 'text-darkgreen/70 opacity-80'
                        }`}
                      >
                        Machine In-Field Inventory
                      </Link>

                      <button onClick={() => handleMachineSubToggle('infield')} className="pr-6 py-1" type="button">
                        <span className={`inline-block transition-transform duration-300 ${activeMachineSubMenu === 'infield' ? 'rotate-90' : 'opacity-80'}`}>
                          <IoIosArrowForward
                            size={12}
                            color={activeMachineSubMenu === 'infield' ? 'rgba(19, 51, 7, 0.85)' : 'rgba(19, 51, 7, 0.7)'}
                          />
                        </span>
                      </button>
                    </div>

                    {activeMachineSubMenu === 'infield' && (
                      <div className="relative ml-6 pb-2">
                        <NavSubLink href="#" active={false}>
                          per Company/AM/Branch
                        </NavSubLink>
                      </div>
                    )}
                  </div>
                )}

                {!activeMachineSubMenu && (
                  <>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Preventive Maintenance
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Machine Pull Out
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Meter Reading
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Parts Requisition
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Machine Reservation
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Machine Request
                    </Link>
                  </>
                )}

                {(activeMachineSubMenu === null || activeMachineSubMenu === 'inventory_view') && (
                  <div className="relative">
                    <div className="flex items-center py-1">
                      <Link
                        href="#"
                        onClick={() => handleMachineSubToggle('inventory_view')}
                        className={`flex-1 pl-8 text-[11px] tracking-tight hover:text-darkgreen font-medium hover:font-semibold transition-opacity lg:text-xs ${
                          activeMachineSubMenu === 'inventory_view'
                            ? 'text-darkgreen/85 hover:font-semibold font-semibold pb-2 pt-1'
                            : 'text-darkgreen/70 opacity-80'
                        }`}
                      >
                        Inventory Machine <span className="text-[11px]">(View Only)</span> 
                      </Link>

                      <button onClick={() => handleMachineSubToggle('inventory_view')} className="pr-6 py-1" type="button">
                        <span className={`inline-block transition-transform duration-300 ${activeMachineSubMenu === 'inventory_view' ? 'rotate-90' : 'opacity-80'}`}>
                          <IoIosArrowForward
                            size={12}
                            color={activeMachineSubMenu === 'inventory_view' ? 'rgba(19, 51, 7, 0.85)' : 'rgba(19, 51, 7, 0.7)'}
                          />
                        </span>
                      </button>
                    </div>

                    {activeMachineSubMenu === 'inventory_view' && (
                      <div className="relative ml-6 pb-1">
                        <NavSubLink href="#" active={false}>
                          Brand New Machine
                        </NavSubLink>
                        <NavSubLink href="#" active={false}>
                          Refurbish Machine
                        </NavSubLink>
                        <NavSubLink href="#" active={false}>
                          Returned Machine
                        </NavSubLink>
                      </div>
                    )}
                  </div>
                )}

                {!activeMachineSubMenu && (
                  <Link
                    href="#"
                    className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs"
                  >
                    Reports
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* SERVICE SUPPORT */}
          <div>
            <div className={`mx-0 group ${isServiceActive ? 'bg-lightgreen shadow-[0px_0px_2px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_1px_3px_rgba(0,0,0,0.4)]' : 'hover:bg-lightgreen/40'} ${serviceExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}>
              <div className="flex items-center px-2 py-2">
                <Link
                  href="#"
                  onClick={(e) => handlePlaceholderModuleClick(e, 'service')}
                  className={`flex items-center flex-1 min-w-0 hover:text-black transition-colors ${
                    isServiceActive ? 'text-black' : 'text-darkgreen'
                  }`}
                >
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors group-hover:bg-green-100 lg:w-8 lg:h-8"
                    title="Service Support Management"
                  >
                    <img src="/images/ssm.webp" alt="Service Support Management" />
                  </div>

                  <span className={`ml-3 text-xs tracking-wide font-semibold lg:text-sm lg:ml-4 ${labelClass}`}>
                    Service Support <br /> Management
                  </span>
                </Link>

                <div className={chevronSlotClass}>
                  <button
                    onClick={(e) => handlePlaceholderModuleClick(e, 'service')}
                    className="p-2"
                    aria-label="Toggle service menu"
                    type="button"
                  >
                    <span className={`inline-block transition-transform duration-300 ${activeModule === 'service' ? 'rotate-90' : ''}`}>
                      <IoIosArrowForward color="black" size={14} />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {isOpen && activeModule === 'service' && (
              <div className="bg-lightgreen/50 rounded-b-lg mx-0 pt-2 pb-2 pl-4 shadow-[0px_0px_0px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_2px_5px_rgba(0,0,0,0.3)] mb-3 lg:pl-6">
                {(activeServiceSubMenu === null || activeServiceSubMenu === 'ticketing') && (
                  <div className="relative">
                    <div className="flex items-center -mt-3 -mb-3 pb-3 py-3">
                      <Link
                        href="#"
                        onClick={() => handleServiceSubToggle('ticketing')}
                        className={`flex-1 px-8 text-[11px] tracking-tight hover:text-darkgreen font-medium hover:font-semibold transition-opacity lg:text-xs ${
                          activeServiceSubMenu === 'ticketing'
                            ? 'text-darkgreen/85 font-semibold pt-1 mb-1'
                            : 'text-darkgreen/70 opacity-80'
                        }`}
                      >
                        Service Ticketing
                      </Link>

                      <button onClick={() => handleServiceSubToggle('ticketing')} className="px-6 py-2" type="button">
                        <span className={`inline-block transition-transform duration-300 ${activeServiceSubMenu === 'ticketing' ? 'rotate-90' : 'opacity-80'}`}>
                          <IoIosArrowForward
                            size={12}
                            color={activeServiceSubMenu === 'ticketing' ? 'rgba(19, 51, 7, 0.85)' : 'rgba(19, 51, 7, 0.7)'}
                          />
                        </span>
                      </button>
                    </div>

                    {activeServiceSubMenu === 'ticketing' && (
                      <div className="relative ml-6 pb-1">
                        <NavSubLink href="#" active={false}>
                          Service Dispatch Web Portal
                        </NavSubLink>
                        <NavSubLink href="#" active={false}>
                          Field Tech Web Portal
                        </NavSubLink>
                        <NavSubLink href="#" active={false}>
                          Client Direct Web Portal
                        </NavSubLink>
                        <NavSubLink href="#" active={false}>
                          Website Support Portal
                        </NavSubLink>
                      </div>
                    )}
                  </div>
                )}

                {!activeServiceSubMenu && (
                  <>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Parts Requisition (BN/RF)
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Reports
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* DELIVERY LOGISTICS */}
          <div>
            <div className={`mx-0 group ${isDeliveryActive ? 'bg-lightgreen shadow-[0px_0px_2px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_1px_3px_rgba(0,0,0,0.4)]' : 'hover:bg-lightgreen/40'} ${deliveryExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}>
              <div className="flex items-center px-2 py-2">
                <Link
                  href="#"
                  onClick={(e) => handlePlaceholderModuleClick(e, 'delivery')}
                  className={`flex items-center flex-1 min-w-0 hover:text-black transition-colors ${
                    isDeliveryActive ? 'text-black' : 'text-darkgreen'
                  }`}
                >
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors group-hover:bg-green-100 lg:w-8 lg:h-8"
                    title="Delivery Logistics Management"
                  >
                    <img src="/images/dlm.webp" alt="Delivery Logistics Management" />
                  </div>

                  <span className={`ml-3 text-xs tracking-wide font-semibold lg:text-sm lg:ml-4 ${labelClass}`}>
                    Delivery Logistics <br /> Management
                  </span>
                </Link>

                <div className={chevronSlotClass}>
                  <button
                    onClick={(e) => handlePlaceholderModuleClick(e, 'delivery')}
                    className="p-2"
                    aria-label="Toggle delivery menu"
                    type="button"
                  >
                    <span className={`inline-block transition-transform duration-300 ${activeModule === 'delivery' ? 'rotate-90' : ''}`}>
                      <IoIosArrowForward color="black" size={14} />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {isOpen && activeModule === 'delivery' && (
              <div className="bg-lightgreen/50 rounded-b-lg mx-0 pt-4 pb-2 pl-4 shadow-[0px_0px_0px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_2px_5px_rgba(0,0,0,0.3)] mb-3 lg:pl-6">
                {(activeDeliverySubMenu === null || activeDeliverySubMenu === 'order_delivery') && (
                  <div className="relative">
                    <div className="flex items-center pb-1 -mt-3 -mb-3 py-3">
                      <Link
                        href="#"
                        onClick={() => handleDeliverySubToggle('order_delivery')}
                        className={`flex-1 px-8 pr-0 text-[11px] tracking-tight hover:text-darkgreen font-medium hover:font-semibold transition-opacity lg:text-xs ${
                          activeDeliverySubMenu === 'order_delivery'
                            ? 'text-darkgreen/85 font-semibold'
                            : 'text-darkgreen/70 opacity-80'
                        }`}
                      >
                        Order & Delivery Management
                      </Link>

                      <button onClick={() => handleDeliverySubToggle('order_delivery')} className="px-6 pl-0 py-1" type="button">
                        <span className={`inline-block transition-transform duration-300 ${activeDeliverySubMenu === 'order_delivery' ? 'rotate-90' : 'opacity-80'}`}>
                          <IoIosArrowForward size={12} color={activeDeliverySubMenu === 'order_delivery' ? 'rgba(19, 51, 7, 0.85)' : 'rgba(19, 51, 7, 0.7)'} />
                        </span>
                      </button>
                    </div>

                    {activeDeliverySubMenu === 'order_delivery' && (
                      <div className="relative ml-6 pb-1 mt-2">
                        <NavSubLink href="#" active={false}>
                          Auto Email Status <br /> Notification
                        </NavSubLink>
                        <NavSubLink href="#" active={false}>
                          Delivery Assignment
                        </NavSubLink>
                      </div>
                    )}
                  </div>
                )}

                {(activeDeliverySubMenu === null || activeDeliverySubMenu === 'vehicle_tracking') && (
                  <div className="relative">
                    <div className="flex items-center -mt-3 -mb-3 pb-1 py-2">
                      <Link
                        href="#"
                        onClick={() => handleDeliverySubToggle('vehicle_tracking')}
                        className={`flex-1 px-8 text-[11px] tracking-tight hover:text-darkgreen font-medium hover:font-semibold transition-opacity lg:text-xs ${
                          activeDeliverySubMenu === 'vehicle_tracking'
                            ? 'text-darkgreen/85 font-semibold mb-2'
                            : 'text-darkgreen/70 opacity-80'
                        }`}
                      >
                        Vehicle Tracking
                      </Link>

                      <button onClick={() => handleDeliverySubToggle('vehicle_tracking')} className="px-6 py-2" type="button">
                        <span className={`inline-block transition-transform duration-300 ${activeDeliverySubMenu === 'vehicle_tracking' ? 'rotate-90' : 'opacity-80'}`}>
                          <IoIosArrowForward
                            size={12}
                            color={activeDeliverySubMenu === 'vehicle_tracking' ? 'rgba(19, 51, 7, 0.85)' : 'rgba(19, 51, 7, 0.7)'}
                          />
                        </span>
                      </button>
                    </div>

                    {activeDeliverySubMenu === 'vehicle_tracking' && (
                      <div className="relative ml-6 pb-1 mt-1">
                        <NavSubLink href="#" active={false}>
                          GPS Monitoring <br />(Manila GPS)
                        </NavSubLink>
                        <NavSubLink href="#" active={false}>
                          Dash Camera Monitoring
                        </NavSubLink>
                        <NavSubLink href="#" active={false}>
                          Gas Consumption <br /> Monitoring
                        </NavSubLink>
                      </div>
                    )}
                  </div>
                )}

                {(activeDeliverySubMenu === null || activeDeliverySubMenu === 'driver_tracking') && (
                  <div className="relative">
                    <div className="flex items-center -mt-3 -mb-3 pb-3 py-2">
                      <Link
                        href="#"
                        onClick={() => handleDeliverySubToggle('driver_tracking')}
                        className={`flex-1 px-8 text-[11px] tracking-tight hover:text-darkgreen font-medium hover:font-semibold transition-opacity lg:text-xs ${
                          activeDeliverySubMenu === 'driver_tracking'
                            ? 'text-darkgreen/85 font-semibold mb-1'
                            : 'text-darkgreen/70 opacity-80'
                        }`}
                      >
                        Driver Tracking
                      </Link>

                      <button onClick={() => handleDeliverySubToggle('driver_tracking')} className="px-6 py-2 pt-1" type="button">
                        <span className={`inline-block transition-transform duration-300 ${activeDeliverySubMenu === 'driver_tracking' ? 'rotate-90' : 'opacity-80'}`}>
                          <IoIosArrowForward
                            size={12}
                            color={activeDeliverySubMenu === 'driver_tracking' ? 'rgba(19, 51, 7, 0.85)' : 'rgba(19, 51, 7, 0.7)'}
                          />
                        </span>
                      </button>
                    </div>

                    {activeDeliverySubMenu === 'driver_tracking' && (
                      <div className="relative ml-6">
                        <NavSubLink href="#" active={false}>
                          Tab/Phone Delivery Receipt
                        </NavSubLink>
                        <NavSubLink href="#" active={false}>
                          Tab/Phone Geolocation
                        </NavSubLink>
                      </div>
                    )}
                  </div>
                )}

                {!activeDeliverySubMenu && (
                  <>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Vehicle Maintenance
                    </Link>
                    <Link href="#" className="block px-8 py-2 text-[11px] text-darkgreen/70 opacity-80 hover:text-darkgreen font-medium hover:font-semibold lg:text-xs">
                      Reports
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ADMIN PANEL */}
          <div>
            <div className={`group ${isAdminActive ? 'bg-lightgreen shadow-[0px_0px_2px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_1px_3px_rgba(0,0,0,0.4)]' : 'hover:bg-lightgreen/50'} ${adminExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}>
              <div className="flex items-center px-2 py-2">
                <Link
                  href={route('admin.location-master.index')}
                  onClick={(e) =>
                    handleRealModuleClick(
                      e,
                      'admin',
                      isAdminActive,
                      route('admin.location-master.index')
                    )
                  }
                  className={`flex items-center flex-1 min-w-0 hover:text-black transition-colors ${
                    isAdminActive ? 'text-black' : 'text-darkgreen'
                  }`}
                >
                  <div
                    title="Admin Panel"
                    className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors lg:w-8 lg:h-8 ${
                      activeModule === 'admin' ? 'bg-white/0' : 'group-hover:bg-green-100'
                    }`}
                  >
                    <img src="/images/admin.webp" alt="Admin Panel" />
                  </div>

                  <span className={`ml-3 text-xs tracking-wide font-semibold lg:text-sm lg:ml-4 ${labelClass}`}>
                    Admin Panel
                  </span>
                </Link>

                <div className={chevronSlotClass}>
                  <button
                    onClick={(e) =>
                      handleRealModuleClick(
                        e,
                        'admin',
                        isAdminActive,
                        route('admin.location-master.index')
                      )
                    }
                    className="p-2"
                    aria-label="Toggle admin menu"
                    type="button"
                  >
                    <span className={`inline-block transition-transform duration-300 ${activeModule === 'admin' ? 'rotate-90' : ''}`}>
                      <IoIosArrowForward color="black" size={14} />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {isOpen && activeModule === 'admin' && (
              <div className="bg-lightgreen/50 rounded-b-lg pt-2 pl-4 shadow-[0px_0px_0px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_2px_5px_rgba(0,0,0,0.3)] mb-7 lg:pl-6">
                <Link
                  href={route('admin.location-master.index')}
                  onClick={(e) => visitAdmin(e, route('admin.location-master.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.location-master.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  Location Master
                </Link>

                <Link
                  href={route('admin.department-master.index')}
                  onClick={(e) => visitAdmin(e, route('admin.department-master.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.department-master.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  Department Master
                </Link>

                <Link
                  href={route('admin.position-master.index')}
                  onClick={(e) => visitAdmin(e, route('admin.position-master.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.position-master.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  Position Master
                </Link>

                <Link
                  href={route('admin.user-management.index')}
                  onClick={(e) => visitAdmin(e, route('admin.user-management.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.user-management.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  User Management
                </Link>

                <Link
                  href={route('admin.approver-matrix.index')}
                  onClick={(e) => visitAdmin(e, route('admin.approver-matrix.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.approver-matrix.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  Approver Matrix
                </Link>

                <Link
                  href={route('admin.user-group-access-rights.index')}
                  onClick={(e) => visitAdmin(e, route('admin.user-group-access-rights.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.user-group-access-rights.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  User Group Access Rights
                </Link>

                <Link
                  href={route('admin.user-access-rights.index')}
                  onClick={(e) => visitAdmin(e, route('admin.user-access-rights.index'))}
                  className={`block px-8 pr-6 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.user-access-rights.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  User Access Rights Management
                </Link>

                
                <Link
                  href={route('admin.printer-master.index')}
                  onClick={(e) => visitAdmin(e, route('admin.printer-master.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.printer-master.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  Printer Master
                </Link>

                <Link
                  href={route('admin.supply-master.index')}
                  onClick={(e) => visitAdmin(e, route('admin.supply-master.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.supply-master.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  Supply Master
                </Link>

                <Link
                  href={route('admin.printer-supplies.index')}
                  onClick={(e) => visitAdmin(e, route('admin.printer-supplies.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.printer-supplies.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  Printer Supplies Master
                </Link>

                <Link
                  href={route('admin.audit-logs.index')}
                  onClick={(e) => visitAdmin(e, route('admin.audit-logs.index'))}
                  className={`block px-8 py-2 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.audit-logs.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  Audit Logs
                </Link>

                <Link
                  href={route('admin.preferences.index')}
                  onClick={(e) => visitAdmin(e, route('admin.preferences.index'))}
                  className={`block px-8 py-2 pb-4 text-[11px] font-medium hover:font-semibold lg:text-xs ${
                    route().current('admin.preferences.*')
                      ? 'text-darkgreen font-semibold opacity-100'
                      : 'text-darkgreen/70 opacity-80 hover:text-darkgreen hover:font-medium'
                  }`}
                >
                  Preferences
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* FOOTER */}
      <div className="relative p-2.5 lg:p-4 lg:pl-3 ml-2 flex flex-col gap-4 items-start">
        <div className="relative">
          <button
            ref={profileBtnRef}
            onClick={() => setActiveItem(activeItem === "profile" ? null : "profile")}
            className="text-darkgreen transition"
            title="Profile"
            aria-label="Profile"
            type="button"
          >
            {activeItem === "profile" ? (
              <FaUserCircle className="w-6 h-6 lg:w-6 lg:h-6" />
            ) : (
              <FaRegUserCircle className="w-6 h-6 lg:w-6 lg:h-6" />
            )}
          </button>

          {activeItem === "profile" &&
            createPortal(
              <div
                ref={dropdownRef}
                className="fixed z-[9999] w-36 overflow-hidden rounded-xl border border-white/20 bg-green-500/20 backdrop-blur-2xl shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
                style={{
                  top: dropdownPos.top - 16,
                  left: dropdownPos.left,
                  transform: "translateY(-100%)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-green-300/10 to-green-600/10 pointer-events-none" />

                <Link
                  href={route("profile.edit")}
                  className="relative flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-green-950 border-b border-black/5 hover:bg-[#e1e1e3] hover:backdrop-blur-md transition-all duration-100"
                  onClick={() => setActiveItem(null)}
                >
                  <UserPen className="w-4 h-4" />
                  <span>Edit Profile</span>
                </Link>

                <Link
                  href={route("logout")}
                  method="post"
                  as="button"
                  className="relative flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-[#ff3b30] hover:bg-white/20 hover:bg-[#e1e1e3] hover:backdrop-blur-md transition-all duration-100"
                  onClick={() => setActiveItem(null)}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Link>
              </div>,
              document.body
            )}
                  </div>
                </div>
              </aside>
            );
          }