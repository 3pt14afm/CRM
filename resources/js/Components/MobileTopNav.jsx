import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { IoIosArrowForward } from 'react-icons/io';
import { route } from 'ziggy-js';
import { Menu, X, UserPen, LogOut, ChevronDownIcon } from 'lucide-react';

/* ---------- small reusable pieces ---------- */

const SubLink = ({ href, active, onNavigate, children }) => (
  <Link
    href={href}
    onClick={onNavigate}
    className={`block pl-4 py-1.5 text-[11px] ${
      active
        ? 'text-darkgreen font-semibold ml-2 border-darkgreen/70 border-l bg-[#B5EBA2] w-[85%]'
        : 'text-darkgreen/70 ml-2 border-l border-[#90E274]'
    }`}
  >
    {children}
  </Link>
);

const SubAccordion = ({ id, label, openId, onToggle, children }) => {
  const open = openId === id;
  return (
    <div className="relative">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onToggle(id)}
          className={`flex-1 text-left pl-8 py-2 text-[11px] tracking-tight font-medium ${
            open ? 'text-darkgreen font-semibold opacity-100' : 'text-darkgreen/70 opacity-80'
          }`}
        >
          {label}
        </button>
        <button onClick={() => onToggle(id)} className="px-6 py-2" type="button" aria-label={`Toggle ${label}`}>
          <span className={`inline-block transition-transform duration-300 ${open ? 'rotate-90' : 'opacity-80'}`}>
            <IoIosArrowForward size={12} color={open ? 'rgba(19, 51, 7, 0.85)' : 'rgba(19, 51, 7, 0.7)'} />
          </span>
        </button>
      </div>
      {open && <div className="relative ml-6 pb-2">{children}</div>}
    </div>
  );
};

const ModuleSection = ({
  id,
  label,
  icon,
  isActive,
  openModule,
  onToggle,
  onNavigate,
  href,
  children,
}) => {
  const expanded = openModule === id;

  return (
    <div>
      <div
        className={`group flex items-center px-2 py-2 ${
          isActive ? 'bg-lightgreen shadow-[0px_0px_2px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_1px_3px_rgba(0,0,0,0.4)]' : ''
        } ${expanded ? 'rounded-t-lg' : 'rounded-lg'}`}
      >
        <Link
          href={href || '#'}
          onClick={(e) => {
            e.preventDefault();
            onToggle(id);
            if (href && expanded) onNavigate?.(href);
          }}
          className={`flex items-center flex-1 min-w-0 ${isActive ? 'text-black' : 'text-darkgreen'}`}
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0">
            <img src={icon} alt={label} />
          </div>
          <span className="ml-3 text-xs tracking-wide font-semibold">{label}</span>
        </Link>

        <button
          onClick={() => onToggle(id)}
          className="p-2"
          aria-label={`Toggle ${label}`}
          type="button"
        >
          <span className={`inline-block transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}>
            <IoIosArrowForward color="black" size={14} />
          </span>
        </button>
      </div>

      {expanded && (
        <div className="bg-lightgreen/50 rounded-b-lg pt-2 pl-4 shadow-[0px_0px_0px_rgba(0,0,0,0.10),-3px_-2px_5px_rgba(220,220,220,0.2),1px_2px_5px_rgba(0,0,0,0.3)] mb-3">
          {children}
        </div>
      )}
    </div>
  );
};

const PlainLink = ({ href, onNavigate, children }) => (
  <Link
    href={href}
    onClick={onNavigate}
    className="block px-8 py-2 text-[11px] font-medium text-darkgreen/70 opacity-80"
  >
    {children}
  </Link>
);

/* ---------- main component ---------- */

export default function MobileTopNav() {
  const { url, props: { auth } } = usePage();
  const user = auth?.user;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerEntered, setDrawerEntered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [openModule, setOpenModule] = useState(null);
  const [openSub, setOpenSub] = useState(null);

  const profileRef = useRef(null);

  const activeByRoute =
    route().current('customers.*') ||
    route().current('customerinfo.*') ||
    route().current('roi.*') ||
    route().current('sprf.*') ||
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

  // open/close drawer with a mount + enter frame, same pattern as the desktop profile menu
  useEffect(() => {
    let raf;
    if (drawerOpen) {
      raf = requestAnimationFrame(() => setDrawerEntered(true));
      document.body.style.overflow = 'hidden';
    } else {
      setDrawerEntered(false);
      document.body.style.overflow = '';
    }
    return () => cancelAnimationFrame(raf);
  }, [drawerOpen]);

  // close everything on route change (i.e. after navigating)
  useEffect(() => {
    setDrawerOpen(false);
    setOpenModule(null);
    setOpenSub(null);
    setProfileOpen(false);
  }, [url]);

  // close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [profileOpen]);

  const toggleModule = (id) => {
    setOpenSub(null);
    setOpenModule((prev) => (prev === id ? null : id));
  };

  const toggleSub = (id) => setOpenSub((prev) => (prev === id ? null : id));

  const navigate = (href) => {
    router.visit(href);
    setDrawerOpen(false);
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      {/* TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-11 px-3 bg-white border-b border-black/10">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-1 text-darkgreen"
          aria-label="Open menu"
          type="button"
        >
          <Menu className="w-5 h-5" />
        </button>

        <img src="/images/logoSmall.webp" alt="CRM Logo" className="h-8 w-auto" />

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-darkgreen/20 text-[10px] font-semibold text-white bg-darkgreen/10"
            aria-label="Profile"
            type="button"
          >
            {user?.hasAvatar ? (
              <img
                src={route('profile.avatar', { employee: user.employee_id }) + '?v=' + new Date(user.updated_at || Date.now()).getTime()}
                alt={user?.name || 'Avatar'}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-darkgreen">
                {user?.name ? user.name.split(/\s+/).filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
              </span>
            )}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-40 z-50 origin-top-right overflow-hidden rounded-xl border border-white/20 bg-green-500/20 backdrop-blur-2xl shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-green-300/10 to-green-600/10 pointer-events-none" />
              <Link
                href={route('profile.edit')}
                className="relative flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-green-950 border-b border-black/5"
                onClick={() => setProfileOpen(false)}
              >
                <UserPen className="w-4 h-4" />
                <span>Edit Profile</span>
              </Link>
              <Link
                href={route('logout')}
                method="post"
                as="button"
                className="relative flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-[#ff3b30]"
                onClick={() => setProfileOpen(false)}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* SLIDE-IN DRAWER */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${drawerEntered ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeDrawer}
          />

          <div
            className={`relative h-full w-[82%] max-w-[300px] bg-white flex flex-col shadow-xl transition-transform duration-300 ease-out ${
              drawerEntered ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-black/5">
              <img src="/images/logo.webp" alt="CRM Logo" className="h-10 w-auto" />
              <button onClick={closeDrawer} className="p-2 text-darkgreen" aria-label="Close menu" type="button">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto no-scrollbar">
              <div className="space-y-1 mx-2 py-2">
                {/* CUSTOMER ACCOUNT MANAGEMENT */}
                <ModuleSection
                  id="customer"
                  label="Customer Account Management"
                  icon="/images/cam.webp"
                  isActive={activeByRoute === 'customer'}
                  openModule={openModule}
                  onToggle={toggleModule}
                  href={route('customerinfo.companies.index')}
                  onNavigate={navigate}
                >
                  {!openSub && (
                    <PlainLink href={route('customerinfo.companies.index')} onNavigate={() => navigate(route('customerinfo.companies.index'))}>
                      Customer Information Details
                    </PlainLink>
                  )}

                  <SubAccordion id="roi" label="Project ROI Approval" openId={openSub} onToggle={toggleSub}>
                    <SubLink href={route('roi.current')} active={route().current('roi.current')} onNavigate={() => navigate(route('roi.current'))}>Current</SubLink>
                    <SubLink href={route('roi.archive')} active={route().current('roi.archive')} onNavigate={() => navigate(route('roi.archive'))}>Archive</SubLink>
                    <SubLink href={route('roi.entry.list')} active={route().current('roi.entry.list')} onNavigate={() => navigate(route('roi.entry.list'))}>Entry</SubLink>
                  </SubAccordion>

                  <SubAccordion id="sprf" label="Project SPRF" openId={openSub} onToggle={toggleSub}>
                    <SubLink href={route('sprf.current')} active={route().current('sprf.current')} onNavigate={() => navigate(route('sprf.current'))}>Current</SubLink>
                    <SubLink href={route('sprf.archive')} active={route().current('sprf.archive')} onNavigate={() => navigate(route('sprf.archive'))}>Archive</SubLink>
                    <SubLink href={route('sprf.entry.list')} active={route().current('sprf.entry.list')} onNavigate={() => navigate(route('sprf.entry.list'))}>Entry</SubLink>
                  </SubAccordion>

                  {!openSub && (
                    <>
                      <PlainLink href={route('proposals.index')} onNavigate={() => navigate(route('proposals.index'))}>Proposal Generation</PlainLink>
                      <PlainLink href="#">Sales Activities Log</PlainLink>
                    </>
                  )}

                  <SubAccordion id="contract" label="Contract Generation" openId={openSub} onToggle={toggleSub}>
                    <SubLink href="#">New Contract</SubLink>
                    <SubLink href="#">Contract Renewal</SubLink>
                    <SubLink href="#">Business Review</SubLink>
                  </SubAccordion>

                  {!openSub && (
                    <>
                      <PlainLink href="#">Client Leads &amp; Alerts</PlainLink>
                      <PlainLink href="#">Machine Reservation</PlainLink>
                      <PlainLink href="#">Machine Request</PlainLink>
                    </>
                  )}

                  <SubAccordion id="reports" label="Reports/View Only" openId={openSub} onToggle={toggleSub}>
                    <SubLink href="#">Inventory Stocks</SubLink>
                    <SubLink href="#">Machine Deliveries</SubLink>
                    <SubLink href="#">Machine Receipts</SubLink>
                    <SubLink href="#">Refurbished IN/OUT Stocks</SubLink>
                    <SubLink href="#">Sales Summary per Account Manager</SubLink>
                  </SubAccordion>
                </ModuleSection>

                {/* MACHINE INVENTORY MANAGEMENT */}
                <ModuleSection
                  id="machine"
                  label="Machine Inventory Management"
                  icon="/images/mim.webp"
                  isActive={activeByRoute === 'machine'}
                  openModule={openModule}
                  onToggle={toggleModule}
                >
                  <SubAccordion id="infield" label="Machine In-Field Inventory" openId={openSub} onToggle={toggleSub}>
                    <SubLink href="#">per Company/AM/Branch</SubLink>
                  </SubAccordion>

                  {!openSub && (
                    <>
                      <PlainLink href="#">Preventive Maintenance</PlainLink>
                      <PlainLink href="#">Machine Pull Out</PlainLink>
                      <PlainLink href="#">Meter Reading</PlainLink>
                      <PlainLink href="#">Parts Requisition</PlainLink>
                      <PlainLink href="#">Machine Reservation</PlainLink>
                      <PlainLink href="#">Machine Request</PlainLink>
                    </>
                  )}

                  <SubAccordion id="inventory_view" label="Inventory Machine (View Only)" openId={openSub} onToggle={toggleSub}>
                    <SubLink href="#">Brand New Machine</SubLink>
                    <SubLink href="#">Refurbish Machine</SubLink>
                    <SubLink href="#">Returned Machine</SubLink>
                  </SubAccordion>

                  {!openSub && <PlainLink href="#">Reports</PlainLink>}
                </ModuleSection>

                {/* SERVICE SUPPORT MANAGEMENT */}
                <ModuleSection
                  id="service"
                  label="Service Support Management"
                  icon="/images/ssm.webp"
                  isActive={activeByRoute === 'service'}
                  openModule={openModule}
                  onToggle={toggleModule}
                >
                  <SubAccordion id="ticketing" label="Service Ticketing" openId={openSub} onToggle={toggleSub}>
                    <SubLink href="#">Service Dispatch Web Portal</SubLink>
                    <SubLink href="#">Field Tech Web Portal</SubLink>
                    <SubLink href="#">Client Direct Web Portal</SubLink>
                    <SubLink href="#">Website Support Portal</SubLink>
                  </SubAccordion>

                  {!openSub && (
                    <>
                      <PlainLink href="#">Parts Requisition (BN/RF)</PlainLink>
                      <PlainLink href="#">Reports</PlainLink>
                    </>
                  )}
                </ModuleSection>

                {/* DELIVERY LOGISTICS MANAGEMENT */}
                <ModuleSection
                  id="delivery"
                  label="Delivery Logistics Management"
                  icon="/images/dlm.webp"
                  isActive={activeByRoute === 'delivery'}
                  openModule={openModule}
                  onToggle={toggleModule}
                >
                  <SubAccordion id="order_delivery" label="Order & Delivery Management" openId={openSub} onToggle={toggleSub}>
                    <SubLink href="#">Auto Email Status Notification</SubLink>
                    <SubLink href="#">Delivery Assignment</SubLink>
                  </SubAccordion>

                  <SubAccordion id="vehicle_tracking" label="Vehicle Tracking" openId={openSub} onToggle={toggleSub}>
                    <SubLink href="#">GPS Monitoring (Manila GPS)</SubLink>
                    <SubLink href="#">Dash Camera Monitoring</SubLink>
                    <SubLink href="#">Gas Consumption Monitoring</SubLink>
                  </SubAccordion>

                  <SubAccordion id="driver_tracking" label="Driver Tracking" openId={openSub} onToggle={toggleSub}>
                    <SubLink href="#">Tab/Phone Delivery Receipt</SubLink>
                    <SubLink href="#">Tab/Phone Geolocation</SubLink>
                  </SubAccordion>

                  {!openSub && (
                    <>
                      <PlainLink href="#">Vehicle Maintenance</PlainLink>
                      <PlainLink href="#">Reports</PlainLink>
                    </>
                  )}
                </ModuleSection>

                {/* ADMIN PANEL */}
                <ModuleSection
                  id="admin"
                  label="Admin Panel"
                  icon="/images/admin.webp"
                  isActive={activeByRoute === 'admin'}
                  openModule={openModule}
                  onToggle={toggleModule}
                  href={route('admin.location-master.index')}
                  onNavigate={navigate}
                >
                  {[
                    ['admin.location-master.index', 'admin.location-master.*', 'Location Master'],
                    ['admin.department-master.index', 'admin.department-master.*', 'Department Master'],
                    ['admin.position-master.index', 'admin.position-master.*', 'Position Master'],
                    ['admin.user-management.index', 'admin.user-management.*', 'User Management'],
                    ['admin.approver-matrix.index', 'admin.approver-matrix.*', 'Approver Matrix'],
                    ['admin.user-group-access-rights.index', 'admin.user-group-access-rights.*', 'User Group Access Rights'],
                    ['admin.user-access-rights.index', 'admin.user-access-rights.*', 'User Access Rights Management'],
                    ['admin.printer-master.index', 'admin.printer-master.*', 'Printer Master'],
                    ['admin.supply-master.index', 'admin.supply-master.*', 'Supply Master'],
                    ['admin.printer-supplies.index', 'admin.printer-supplies.*', 'Printer Supplies Master'],
                    ['admin.audit-logs.index', 'admin.audit-logs.*', 'Audit Logs'],
                    ['admin.preferences.index', 'admin.preferences.*', 'Preferences'],
                  ].map(([routeName, pattern, label]) => (
                    <Link
                      key={routeName}
                      href={route(routeName)}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(route(routeName));
                      }}
                      className={`block px-8 py-2 text-[11px] font-medium ${
                        route().current(pattern) ? 'text-darkgreen font-semibold opacity-100' : 'text-darkgreen/70 opacity-80'
                      }`}
                    >
                      {label}
                    </Link>
                  ))}
                </ModuleSection>
              </div>
            </nav>

            {/* FOOTER / PROFILE */}
            <div className="border-t border-black/5 p-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-darkgreen/20 text-[10px] font-semibold text-white ${user?.hasAvatar ? 'bg-white' : 'bg-darkgreen/10'}`}>
                  {user?.hasAvatar ? (
                    <img
                      src={route('profile.avatar', { employee: user.employee_id }) + '?v=' + new Date(user.updated_at || Date.now()).getTime()}
                      alt={user?.name || 'Avatar'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-darkgreen">
                      {user?.name ? user.name.split(/\s+/).filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-darkgreen truncate max-w-[160px]">{user?.name ?? 'User'}</span>
                  <span className="text-[10px] text-darkgreen/60 truncate max-w-[160px]">{user?.position ?? user?.role ?? ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}