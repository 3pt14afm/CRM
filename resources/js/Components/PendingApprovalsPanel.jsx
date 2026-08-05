import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Link, router } from "@inertiajs/react";
import { FaRegFileAlt } from "react-icons/fa";
import { MdDonutLarge, MdShowChart, MdChecklist } from "react-icons/md";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Sector } from "recharts";

const MAX_VISIBLE = 3;

const STATUS_COLORS = {
  pending: "#fcd34d",   // amber-300
  rejected: "#fca5a5",  // red-300
  cancelled: "#d1d5db", // gray-300
  completed: "#6ee7b7", // emerald-300
};

const STATUS_GRADIENTS = {
  pending:   ["#fde68a", "#fcd34d"], // amber-200 → amber-300
  rejected:  ["#fecaca", "#fca5a5"], // red-200 → red-300
  cancelled: ["#e5e7eb", "#d1d5db"], // gray-200 → gray-300
  completed: ["#a7f3d0", "#6ee7b7"], // emerald-200 → emerald-300
};

const STATUS_LABELS = {
  pending: "Pending Approvals",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

const PERIODS = [
  { key: "week", label: "W" },
  { key: "month", label: "M" },
  { key: "year", label: "Y" },
];

const TABS = [
  { key: "distribution", label: "Distribution", icon: MdDonutLarge },
  { key: "trend", label: "Entries by Month", icon: MdShowChart },
  { key: "approvals", label: "Pending Approvals", icon: MdChecklist },
];

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6} 
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={6}
        fill={fill}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const bgColor = STATUS_COLORS[dataPoint.key] || "#1f2937";

    return (
      <div
        style={{
          backgroundColor: `color-mix(in srgb, ${bgColor} 15%, white)`,
          border: "1px solid #f3f4f6",
          borderRadius: "0.75rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
          padding: "8px 12px",
          outline: "none",
        }}
      >
        <span 
          style={{ 
            fontSize: "12px", 
            fontWeight: "600",
            textTransform: "capitalize"
          }}
        >
          {dataPoint.name} : {dataPoint.value}
        </span>
      </div>
    );
  }
  return null;
};

function DistributionDonut({ title, bucket, loading, onSliceClick  }) {

  const data = useMemo(() => {
    if (!bucket) return [];
    return Object.keys(STATUS_LABELS)
      .map((key) => ({
        key,
        name: STATUS_LABELS[key],
        value: bucket[key] ?? 0,
        fill: `url(#grad-${key})`,
      }))
      .filter((d) => d.value > 0);
  }, [bucket]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  return (
    <div className="flex flex-col items-center flex-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>

      <div className="relative w-full h-[160px] [&_.recharts-surface]:outline-none [&_.recharts-pie-sector]:outline-none">
        {!loading && total > 0 && (
          <PieChart style={{ width: "100%", height: "100%" }} responsive>
            <defs>
              <filter id="pie-shadow" x="-20%" y="-10%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.12" />
              </filter>

              {Object.keys(STATUS_COLORS).map((key) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={STATUS_GRADIENTS[key][0]} />
                  <stop offset="100%" stopColor={STATUS_GRADIENTS[key][1]} />
                </linearGradient>
              ))}
            </defs>

            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={47}
              outerRadius={68}
              paddingAngle={8}
              cornerRadius={6}
              stroke="none"
              isAnimationActive={true}
              animationBegin={50}
              animationDuration={900}
              animationEasing="ease-out"
              activeShape={renderActiveShape}
              filter="url(#pie-shadow)"
              onClick={(entry) => onSliceClick?.(entry.key)}
              style={{ cursor: onSliceClick ? "pointer" : "default" }}
            />
            
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 9999, outline: "none" }} />
          </PieChart>
        )}

        {loading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg animate-pulse" />
        )}

        {!loading && total === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-black/40 italic">
            No data for this period
          </div>
        )}

        {!loading && total > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-semibold text-gray-800">{total}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Total</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 w-full px-3">
        {Object.keys(STATUS_LABELS).map((key) => (
          <div key={key} className="flex items-center justify-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: STATUS_COLORS[key] }}
            />
            <span className="text-[11px] text-gray-600">
              {STATUS_LABELS[key]} <span className="text-gray-400">({bucket?.[key] ?? 0})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistributionTab() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get(route("customers.distribution-stats"), { params: { period } })
      .then((res) => setData(res.data))
      .catch((err) => console.error("Failed to load distribution stats", err))
      .finally(() => setLoading(false));
  }, [period]);

  const goToRoi = (key) => {
    const url = key === "pending"
      ? route("roi.current", { mine: 1 })
      : route("roi.archive", { status: key === "completed" ? "approved" : key });
    router.visit(url);
  };

  const goToSprf = (key) => {
    const url = key === "pending"
      ? route("sprf.current", { mine: 1 })
      : route("sprf.archive", { status: key === "completed" ? "approved" : key });
    router.visit(url);
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex justify-end mb-2">
        <div className="inline-flex gap-1 rounded-full">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`text-[11px] font-medium px-2 py-1 border rounded-full transition-colors ${
                period === p.key
                  ? "bg-sky-500 text-white font-semibold shadow"
                  : "text-gray-500 hover:text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 divide-x divide-gray-300">
        <div className="flex-1 px-2">
          <DistributionDonut title="ROI" bucket={data?.roi} loading={loading} onSliceClick={goToRoi} />
        </div>

        <div className="flex-1 px-2">
          <DistributionDonut title="SPRF" bucket={data?.sprf} loading={loading} onSliceClick={goToSprf} />
        </div>
      </div>
    </div>
  );
}

function TrendTab() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(route("customers.entries-by-month"))
      .then((res) => setSeries(res.data))
      .catch((err) => console.error("Failed to load entries-by-month", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1 mt-8">
      {loading ? (
        <div className="h-[235px] bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height={235}>
          <LineChart data={series} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="roi" name="ROI" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sprf" name="SPRF" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ApprovalsTab({ sections }) {
  return (
    <div className="flex flex-col gap-5 mt-6">
      {sections.map((section) => {
        const items = Array.isArray(section.items) ? section.items : [];
        const visibleItems = items.slice(0, MAX_VISIBLE);
        const hasMore = items.length > MAX_VISIBLE;

        return (
          <div key={section.label}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {section.label}
                </p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                  {items.length}
                </span>
              </div>

              {hasMore && (
                <Link
                  href={section.href}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Show all
                </Link>
              )}
            </div>

            {visibleItems.length === 0 ? (
              <p className="text-xs text-center text-black/40 italic">Nothing pending</p>
            ) : (
              <div className="flex flex-col px-2.5">
                {visibleItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between py-1.5 -mx-2 px-2 rounded-2xl transition-colors border border-transparent hover:border-emerald-700"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-800 font-medium">{item.company_name}</span>
                      <span className="text-[11px] text-black/50">{item.prepared_by}</span>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
                      {item.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PendingApprovalsPanel({ sections }) {
  const [activeTab, setActiveTab] = useState("distribution");

  return (
    <div className="bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/50 rounded-lg shadow-[0px_4px_4px_1px_rgba(0,_0,_0,_0.1)] px-6 py-5 flex flex-col h-[400px]">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold text-gray-800">
        <FaRegFileAlt />ROI & SPRF Action Center
      </h2>

      <div className="flex flex-col flex-1">
        {activeTab === "distribution" && <DistributionTab />}
        {activeTab === "trend" && <TrendTab />}
        {activeTab === "approvals" && <ApprovalsTab sections={sections} />}
      </div>
      
      <div className="relative grid grid-cols-3 p-1 shadow-inner mt-8 border w-fit mx-auto border-gray-100 rounded-2xl bg-white">
        {/* Sliding background pill now carries the shadow */}
        {(() => {
          const activeIndex = TABS.findIndex((t) => t.key === activeTab);
          return (
            <div
              className="absolute top-1 bottom-1 left-1 bg-emerald-200/40 shadow rounded-2xl transition-transform duration-300 ease-out will-change-transform"
              style={{
                width: `calc((100% - 8px) / ${TABS.length})`,
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            />
          );
        })()}

        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative z-10 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-2xl transition-colors duration-300 ${
                isActive ? "text-emerald-800 font-semibold" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}