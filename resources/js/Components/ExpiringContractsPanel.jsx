import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "@inertiajs/react";
import { LuClockAlert, LuEye } from "react-icons/lu";

const TABS = [
  { key: "expiring_soon", label: "Expiring", activeClass: "text-white bg-red-500 shadow-inner", },
  { key: "active", label: "Active", activeClass: "text-white bg-emerald-500 shadow-inner", },
  { key: "expired", label: "Expired", activeClass: "text-white bg-gray-500 shadow-inner", },
];

export default function ExpiringContractsPanel({ activeTab: controlledTab, onTabChange }) {
  const [internalTab, setInternalTab] = useState("expiring_soon");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get(route("customers.expiring-contracts", { status: activeTab }))
      .then((res) => setContracts(res.data))
      .catch((err) => console.error("Failed to load contracts", err))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/50 rounded-lg shadow-[0px_4px_4px_1px_rgba(0,_0,_0,_0.1)] px-6 py-5 flex flex-col min-h-[380px]">
      <div className="flex items-center justify-between mb-3 pb-3">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-gray-800">
          <LuClockAlert />Contracts
        </h2>
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-2 py-1 text-[11px] font-medium rounded-2xl border -mb-px transition-colors ${
                activeTab === tab.key ? tab.activeClass
                  : "text-gray-500 shadow-sm hover:text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      

      {loading ? (
        <div className="flex flex-col gap-2 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : contracts.length > 0 ? (
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            <span className="w-[55%]">Company Name</span>
            <span className="w-[25%] text-right">Expiry Date</span>
            <span className="w-[20%] text-right">Days</span>
          </div>
          <div className="flex flex-col divide-y divide-gray-100 overflow-y-auto pr-1">
            {contracts.map((c) => (
              <Link
                href={`${route("contract.upload")}?company_id=${c.company_id}&company_name=${encodeURIComponent(c.company_name)}&can_upload=${c.can_upload ? 1 : 0}`}
                key={c.id}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors hover:border hover:border-red-300"
              >
                <span className="text-xs text-gray-700 truncate w-[55%]" title={c.company_name}>
                  {c.company_name}
                </span>
                <span className="text-xs text-gray-600 whitespace-nowrap w-[25%] text-right">
                  {formatDate(c.expires_at)}
                  {c.was_extended && <span className="text-gray-400 font-normal"> (ext.)</span>}
                </span>
                <span className={`text-xs font-medium whitespace-nowrap w-[20%] text-right ${daysRemainingClass(c.days_remaining)}`}>
                  {formatDaysRemaining(c.days_remaining)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-black/40 italic text-center max-w-[220px]">
            No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} contracts
          </p>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDaysRemaining(days) {
  if (days === null || days === undefined) return "—";
  if (days === 0) return "Today";

  const overdue = days < 0;
  const abs = Math.abs(days);
  const months = Math.floor(abs / 30);
  const remDays = abs % 30;

  const parts = [];
  if (months > 0) parts.push(`${months}m`);
  if (remDays > 0 || months === 0) parts.push(`${remDays}d`);

  const label = parts.join(" ");
  return overdue ? `${label} overdue` : label;
}

function daysRemainingClass(days) {
  if (days === null || days === undefined) return "text-gray-400";
  if (days < 0) return "text-gray-500";
  if (days <= 30) return "text-red-600";
  return "text-emerald-600";
}