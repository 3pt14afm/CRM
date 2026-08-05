import React, { useEffect, useState } from "react";
import axios from "axios";
import { BsExclamationOctagonFill } from "react-icons/bs";
import StatCard from "@/Components/StatCard";

const STATUS_STYLES = {
  expiring_soon: { label: "Expiring", labelClass: "text-red-500", valueClass: "text-red-500" },
  active: { label: "Active", labelClass: "text-emerald-500", valueClass: "text-emerald-500" },
  expired: { label: "Expired", labelClass: "text-gray-500", valueClass: "text-gray-900" },
};

export default function ContractStatusCard({ theme, index = 0, onStatusClick, selectedStatus }) {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(route("customers.contract-status-stats"))
      .then((res) => setCounts(res.data))
      .catch((err) => console.error("Failed to load contract status stats", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StatCard icon={BsExclamationOctagonFill} title="Contract Status" theme={theme} index={index}>
      {loading ? (
        <div className="grid grid-cols-3 gap-6 mt-2">
          {Object.keys(STATUS_STYLES).map((key) => (
            <div key={key} className="h-9 w-10 bg-black/5 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-8 mt-1 w-full">
          {Object.keys(STATUS_STYLES).map((key) => (
            <StatusStat
              key={key}
              label={STATUS_STYLES[key].label}
              value={counts?.[key] ?? 0}
              labelClass={STATUS_STYLES[key].labelClass}
              valueClass={STATUS_STYLES[key].valueClass}
              active={selectedStatus === key}
              onClick={() => onStatusClick?.(key)}
            />
          ))}
        </div>
      )}
    </StatCard>
  );
}

function StatusStat({ label, value, labelClass, valueClass, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-md px-1 py-0.5 transition-colors hover:bg-rose-500/5 hover:shadow-inner`}
    >
      <span className={`text-[10px] font-medium ${labelClass}`}>{label}</span>
      <span className={`text-2xl font-bold leading-tight ${valueClass}`}>{value}</span>
    </button>
  );
}