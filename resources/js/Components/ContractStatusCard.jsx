import React, { useEffect, useState } from "react";
import axios from "axios";
import StatCard from "@/Components/StatCard";
import { IoAlertCircle } from "react-icons/io5";

const STATUS_STYLES = {
  expiring_soon: { label: "Expiring", labelClass: "text-amber-500", valueClass: "text-amber-500" },
  active: { label: "Active", labelClass: "text-emerald-500", valueClass: "text-emerald-500" },
  expired: { label: "Expired", labelClass: "text-red-500", valueClass: "text-red-500" },
  total_active: { label: "Total Active", labelClass: "text-darkgreen", valueClass: "text-darkgreen" },
  no_contracts: { label: "No Contract", labelClass: "text-gray-500", valueClass: "text-gray-500" },
};

const CLICKABLE_STATUSES = ["expiring_soon", "active", "expired"];

export default function ContractStatusCard({ theme, index = 0, onStatusClick, selectedStatus, onReady, className = '' }) {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(route("customers.contract-status-stats"))
      .then((res) => setCounts(res.data))
      .catch((err) => console.error("Failed to load contract status stats", err))
      .finally(() => {
        setLoading(false);
        onReady?.();
      });
  }, []);

  return (
    <StatCard 
      icon={IoAlertCircle} 
      title="Contract Status" 
      theme={theme} 
      index={index} 
      className={className}
    >
      {loading ? (
        <div className="grid grid-cols-5 gap-2.5 mt-2">
          {Object.keys(STATUS_STYLES).map((key) => (
            <div key={key} className="h-9 w-10 bg-black/5 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 lg:gap-2.5 mt-1 w-full">
          {Object.keys(STATUS_STYLES).map((key) => {
            const value = key === "total_active" 
              ? (counts?.active ?? 0) + (counts?.expiring_soon ?? 0)
              : (counts?.[key] ?? 0);

            return (
              <StatusStat
                key={key}
                label={STATUS_STYLES[key].label}
                value={value}
                labelClass={STATUS_STYLES[key].labelClass}
                valueClass={STATUS_STYLES[key].valueClass}
                active={selectedStatus === key}
                clickable={CLICKABLE_STATUSES.includes(key)}
                onClick={() => onStatusClick?.(key)}
              />
            );
          })}
        </div>
      )}
    </StatCard>
  );
}

function StatusStat({ label, value, labelClass, valueClass, active, clickable, onClick }) {
  const content = (
    <>
      <span className={`text-[9px] lg:text-[10px] font-medium ${labelClass}`}>{label}</span>
      <span className={`text-lg lg:text-2xl font-bold leading-tight ${valueClass}`}>{value}</span>
    </>
  );

  if (!clickable) {
    return (
      <div className="flex flex-col items-start rounded-md py-0.5">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start justify-between rounded-md py-0.5 transition-colors hover:bg-rose-500/5 hover:shadow-inner`}
    >
      {content}
    </button>
  );
}