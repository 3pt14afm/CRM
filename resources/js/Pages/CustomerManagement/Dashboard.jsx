import { useEffect, useState } from "react";
import axios from "axios";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, usePage } from "@inertiajs/react";
import { MdAdd, MdGroups, MdPersonAddAlt1 } from "react-icons/md";
import { FaUserCheck } from "react-icons/fa";

import StatCard from "@/Components/StatCard";
import ContractStatusCard from "@/Components/ContractStatusCard";
import PendingApprovalsPanel from "@/Components/PendingApprovalsPanel";
import ExpiringContractsPanel from "@/Components/ExpiringContractsPanel";
import { cardThemes, defaultCardTheme } from "@/Config/cardThemes";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const { auth } = usePage().props;
  const [contractsTab, setContractsTab] = useState("expiring_soon");

  useEffect(() => {
    axios
      .get(route("customers.stats"))
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Failed to load dashboard stats", err));
  }, []);

  const statsLoading = stats === null;

  const cards = [
    { icon: MdGroups, name: "Total Customer", value: stats?.total_customers },
    { icon: FaUserCheck, name: "Active Accounts", value: stats?.active_accounts },
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

      <div className="mx-3 lg:px-8">
        <div className="flex items-center justify-between py-5 mt-2">
          <h1 className="text-md font-medium text-gray-800">
          </h1>

          <span className="text-xs text-gray-500 tabular-nums">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" · "}
            {now.toLocaleTimeString("en-US")}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start gap-1">
            <span className="text-2xl font-medium text-gray-800">Welcome Back, {auth.user.first_name}!</span>
            <span className="text-gray-600 text-sm">Here's what's happening today.</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href={route("roi.entry.create")} className="flex items-center gap-2 text-xs font-medium shadow-md pl-3 pr-4 py-2.5 rounded-lg bg-gradient-to-br from-emerald-200/70 via-emerald-100/80 to-emerald-200/70 text-emerald-900 hover:from-emerald-600 hover:to-teal-600 transition-colors hover:text-white">
              <MdAdd size={16} />New ROI Entry
            </Link>
            <Link href={route("sprf.entry.create")} className="flex items-center gap-2 text-xs font-medium shadow-md pl-3 pr-4 py-2.5 rounded-lg bg-gradient-to-br from-amber-200/70 via-amber-100/80 to-amber-200/70 text-amber-900 hover:from-amber-600 hover:to-orange-600 transition-colors hover:text-white">
              <MdAdd size={16} />New SPRF Entry
            </Link>
          </div>
        </div>

        {/* Row 1: Stat cards. Each card renders immediately and shows its own
            shaped skeleton (icon/title stay visible, value placeholder pulses)
            until its data arrives — no whole-page gate. */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-6">
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
          />
        </div>

        {/* Row 2: Pending approvals + expiring contracts. Both panels already
            manage their own internal skeleton state and render their chrome
            (header, tabs) immediately, so they're mounted directly here. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 pb-5">
          <PendingApprovalsPanel />
          <ExpiringContractsPanel
            activeTab={contractsTab}
            onTabChange={setContractsTab}
          />
        </div>
      </div>
    </>
  );
}

Dashboard.layout = (page) => <AuthenticatedLayout children={page} />;