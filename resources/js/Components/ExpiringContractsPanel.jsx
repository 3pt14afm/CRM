import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link } from "@inertiajs/react";
import { LuClockAlert } from "react-icons/lu";

const TABS = [
  { key: "expiring_soon", label: "Expiring", activeClass: "text-white bg-amber-500 shadow-inner", },
  { key: "active", label: "Active", activeClass: "text-white bg-emerald-500 shadow-inner", },
  { key: "expired", label: "Expired", activeClass: "text-white bg-red-500 shadow-inner", },
];

export default function ExpiringContractsPanel({ activeTab: controlledTab, onTabChange, onReady }) {
  const [internalTab, setInternalTab] = useState("expiring_soon");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const firedRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(route("customers.expiring-contracts", { status: activeTab }))
      .then((res) => setContracts(res.data))
      .catch((err) => console.error("Failed to load contracts", err))
      .finally(() => {
        setLoading(false);
        if (!firedRef.current) {
          firedRef.current = true;
          onReady?.();
        }
      });
  }, [activeTab]);

  return (
    <div className="bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/50 rounded-lg shadow-[0px_4px_4px_1px_rgba(0,_0,_0,_0.1)] px-3 sm:px-4 xl:px-6 py-3 sm:py-4 xl:py-5 flex flex-col h-[400px] sm:h-[420px] xl:h-[445px]">
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 pb-2 sm:pb-3">
        <h2 className="flex items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm font-semibold text-gray-800">
          <LuClockAlert />Contracts
        </h2>
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-medium rounded-2xl border -mb-px transition-colors ${
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
        <div className="flex flex-col gap-1.5 sm:gap-2 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 sm:h-9 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : contracts.length > 0 ? (
        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
        {/* Header - stays fixed */}
        <div className="grid grid-cols-[40fr_20fr_20fr_15fr_5fr] gap-2.5 items-center pr-3 pl-1 pb-1.5 sm:pb-2 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">
          <span className="min-w-0 truncate">Company Name</span>
          <span className="min-w-0 truncate">Type</span>
          <span className="min-w-0 truncate">AM</span>
          <span className="min-w-0 truncate">Expiry Date</span>
          <span className="min-w-0">Days</span>
        </div>

        {/* ONLY THIS PART SCROLLS */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
          <div className="flex flex-col divide-y divide-gray-100 min-w-0">
            {contracts.map((c) => (
              <Link
                href={`${route(
                  "contract.upload"
                )}?company_id=${c.company_id}&company_name=${encodeURIComponent(
                  c.company_name
                )}&sap_code=${encodeURIComponent(
                  c.sap_code ?? ""
                )}&can_upload=${
                  c.can_upload ? 1 : 0
                }&contract_id=${c.id}`}
                key={c.id}
                className="grid grid-cols-[40fr_20fr_20fr_15fr_5fr] gap-2.5 items-center py-1.5 px-1 rounded-lg transition-colors hover:bg-slate-50 hover:font-bold min-w-0 w-full"
              >
                <span
                  className="min-w-0 max-w-full whitespace-normal text-[11px] text-gray-700"
                  title={c.company_name}
                >
                  {c.company_name}
                </span>

                <span
                  className="min-w-0 max-w-full whitespace-normal text-[10px] sm:text-[11px] text-gray-600"
                  title={c.contract_type ?? ""}
                >
                  {c.contract_type ?? "—"}
                </span>

                <span
                  className="min-w-0 max-w-full whitespace-normal truncate text-[10px] sm:text-[11px] text-gray-600"
                  title={c.account_manager ?? ""}
                >
                  {c.account_manager ?? "—"}
                </span>

                <span
                  className="min-w-0 max-w-full whitespace-normal truncate text-[10px] sm:text-[11px] text-gray-600"
                  title={formatDate(c.expires_at)}
                >
                  {formatDate(c.expires_at)}
                  {c.was_extended && (
                    <span className="text-gray-400 font-normal">
                      {" "}
                      (ext.)
                    </span>
                  )}
                </span>

                <span
                  className={`min-w-0 max-w-full text-[10px] sm:text-[11px] font-medium ${daysRemainingClass(
                    c.days_remaining
                  )}`}
                >
                  {formatDaysRemaining(c.days_remaining)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs sm:text-sm text-black/40 italic text-center max-w-[180px] sm:max-w-[220px]">
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

const formatDaysRemaining = (days) => {
  if (days == null) return "—";

  const totalDays = Math.abs(Number(days));

  const months = Math.floor(totalDays / 30);
  const remainingDays = totalDays % 30;

  if (months > 0 && remainingDays > 0) {
    return (
      <>
        {months}m
        <br />
        {remainingDays}d
      </>
    );
  }

  if (months > 0) {
    return `${months}m`;
  }

  return `${remainingDays}d`;
};

function daysRemainingClass(days) {
  if (days === null || days === undefined) return "text-gray-400";
  if (days < 0) return "text-red-500";
  if (days <= 180) return "text-amber-600";
  return "text-emerald-600";
}