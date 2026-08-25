import { useEffect, useState } from "react";
import axios from "axios";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, usePage } from "@inertiajs/react";
import { MdAdd, MdGroups, MdPersonAddAlt1 } from "react-icons/md";

import StatCard from "@/Components/StatCard";
import ContractStatusCard from "@/Components/ContractStatusCard";
import PendingApprovalsPanel from "@/Components/PendingApprovalsPanel";
import ExpiringContractsPanel from "@/Components/ExpiringContractsPanel";
import { cardThemes, defaultCardTheme } from "@/Config/cardThemes";
import { BiSolidUserCheck } from "react-icons/bi";
import ScrollableSelect from "@/Components/ScrollableSelect";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const { auth } = usePage().props;
  const [contractsTab, setContractsTab] = useState("expiring_soon");
  const [clientManagers, setClientManagers] = useState([]);
  const [viewAsUserId, setViewAsUserId] = useState("");

  useEffect(() => {
    axios
      .get(route("customers.stats"), {
        params: viewAsUserId ? { as_user_id: viewAsUserId } : {},
      })
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Failed to load dashboard stats", err));
  }, [viewAsUserId]);

  useEffect(() => {
    axios
      .get(route("dashboard.clientManagers"))
      .then((res) => setClientManagers(res.data ?? []))
      .catch((err) => console.error("Failed to load client managers", err));
  }, []);

  const statsLoading = stats === null;

  const cards = [
    { icon: BiSolidUserCheck, name: "Active Accounts", value: stats?.active_accounts },
    { icon: MdGroups, name: "Total Account & Branches", value: stats?.total_customers },
    { icon: MdPersonAddAlt1, name: "Prospect Customers", value: stats?.prospect_customers },
  ];

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head title="Customer Account Management Dashboard" />

      <div className="mx-3 px-2 lg:px-3 xl:px-6">
        <div className="flex items-center justify-between pb-0 pt-3 lg:py-5 mt-2">
          <h1 className="text-md font-medium text-gray-800">
          </h1>

          <span className="text-[11px] lg:text-xs text-gray-500 tabular-nums">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" · "}
            {now.toLocaleTimeString("en-US")}
          </span>
        </div>

        <div className="grid items-center">
          <div className="flex flex-col my-4 md:my-0 items-start gap-1">
            <span className="text-xl lg:text-2xl font-medium text-gray-800">Welcome Back, {auth.user.first_name}!</span>
            <span className="text-gray-600 text-xs lg:text-sm">Here's what's happening today.</span>
          </div>

          <div className="flex items-center justify-end gap-2 lg:gap-3">
            {/* {clientManagers.length > 0 && (
              <ScrollableSelect
                value={viewAsUserId}
                onChange={setViewAsUserId}
                options={[{ id: "", name: "My View" }, ...clientManagers]}
                placeholder="View as..."
                isSearchable
                showSelected
                className="w-40 lg:w-48"
              />
            )} */}
            <Link href={route("roi.entry.create")} className="flex items-center gap-1 lg:gap-2 text-[11px] lg:text-xs font-medium shadow-md pl-1.5 pr-2.5 py-1.5 lg:pl-3 lg:pr-4 lg:py-2.5 rounded-lg bg-gradient-to-br from-emerald-200/70 via-emerald-100/80 to-emerald-200/70 text-emerald-900 hover:from-emerald-600 hover:to-teal-600 transition-colors hover:text-white">
              <MdAdd className="size-3 lg:size-4" />New ROI Entry
            </Link>
            <Link href={route("sprf.entry.create")} className="flex items-center gap-1 lg:gap-2 text-[11px] lg:text-xs font-medium shadow-md pl-1.5 pr-2.5 py-1.5 lg:pl-3 lg:pr-4 lg:py-2.5 rounded-lg bg-gradient-to-br from-amber-200/70 via-amber-100/80 to-amber-200/70 text-amber-900 hover:from-amber-600 hover:to-orange-600 transition-colors hover:text-white">
              <MdAdd className="size-3 lg:size-4" />New SPRF Entry
            </Link>
          </div>
        </div>

        {/* Row 1: Stat cards. */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:gap-4 pt-5 lg:pt-6">
          {cards.map((card, index) => (
            <StatCard
              key={card.name}
              icon={card.icon}
              title={card.name}
              value={card.value ?? 0}
              loading={statsLoading}
              theme={cardThemes[card.name] ?? defaultCardTheme}
              index={index}
            />
          ))}

          <ContractStatusCard
            theme={cardThemes["At-Risk Accounts"] ?? defaultCardTheme}
            index={cards.length}
            onStatusClick={setContractsTab}
            selectedStatus={contractsTab}
            className="col-span-1 md:col-span-2"
          />
        </div>

        {/* Row 2: Pending approvals + expiring contracts.*/}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4 pt-5 pb-5 mb-12 md:mb-0">
          {/* Approvals */}
          <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-5">
              <PendingApprovalsPanel entity="roi" />
              <PendingApprovalsPanel entity="sprf" />
          </div>

          {/* Expiring Contracts */}
          <div className="col-span-1 lg:col-span-2">
              <ExpiringContractsPanel
                  activeTab={contractsTab}
                  onTabChange={setContractsTab}
              />
          </div>
        </div>
      </div>
    </>
  );
}

Dashboard.layout = (page) => <AuthenticatedLayout children={page} />;