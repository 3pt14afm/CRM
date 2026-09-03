import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { Link, router, usePage } from "@inertiajs/react";
import { FaRegFileAlt } from "react-icons/fa";
import { MdDonutLarge, MdShowChart, MdChecklist } from "react-icons/md";
import { PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid, Sector, BarChart, Bar, matchByDataKey } from "recharts";

const MAX_VISIBLE = 5;

const STATUS_COLORS = {
  pending: "#fcd34d",
  pending_projects: "#93c5fd",
  rejected: "#fca5a5",
  cancelled: "#d1d5db",
  completed: "#6ee7b7",
};

const STATUS_GRADIENTS = {
  pending:           ["#fde68a", "#fcd34d"],
  pending_projects:  ["#bfdbfe", "#93c5fd"],
  rejected:          ["#fecaca", "#fca5a5"],
  cancelled:         ["#e5e7eb", "#d1d5db"],
  completed:         ["#a7f3d0", "#6ee7b7"],
};

const STATUS_LABELS = {
  pending: "Pending Approvals",
  pending_projects: "Your Pending Projects",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

function getStatusLabels(isApprover) {
  const labels = { ...STATUS_LABELS, pending: isApprover ? "Pending Approvals" : "Pending" };
  if (!isApprover) {
    const { pending_projects, ...rest } = labels;
    return rest;
  }
  return labels;
}

// Per-entity route/label config — the panel is generic, this is what makes
// one instance "ROI" and another "SPRF".
const ENTITY_CONFIG = {
  roi: {
    label: "ROI",
    color: "#10b981",
    routeCurrent: "roi.current",
    routeArchive: "roi.archive",
  },
  sprf: {
    label: "SPRF",
    color: "#f59e0b",
    routeCurrent: "sprf.current",
    routeArchive: "sprf.archive",
  },
};

const PERIODS = [
  { key: "week", label: "W" },
  { key: "month", label: "M" },
  { key: "year", label: "Y" },
];

const PENDING_SUBTABS = [
  { key: "approvals", label: "Approvals" },
  { key: "mine", label: "My Projects" },
];

const TABS = [
  { key: "distribution", label: "Summary", icon: MdDonutLarge },
  { key: "trend", label: "Monthly Entries", icon: MdShowChart },
  { key: "approvals", label: "Pending", icon: MdChecklist },
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
        <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "capitalize" }}>
          {dataPoint.name} : {dataPoint.value}
        </span>
      </div>
    );
  }
  return null;
};

function DistributionDonut({ title, bucket, loading, onSliceClick, statusLabels }) {
  const data = useMemo(() => {
    if (!bucket) return [];
    return Object.keys(statusLabels)
      .map((key) => ({
        key,
        name: statusLabels[key],
        value: bucket[key] ?? 0,
        fill: `url(#grad-${key})`,
      }))
      .filter((d) => d.value > 0);
  }, [bucket, statusLabels]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  return (
    <div className="flex flex-col items-center flex-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>

      <div className="relative w-full h-[150px] sm:h-[170px] xl:h-[200px] [&_.recharts-surface]:outline-none [&_.recharts-pie-sector]:outline-none">
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
              innerRadius="55%"
              outerRadius="80%"
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
            <span className="text-base sm:text-lg font-semibold text-gray-800">{total}</span>
            <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wide">Total</span>
          </div>
        )}
      </div>

      {(() => {
        const { completed, ...restLabels } = statusLabels;
        const restKeys = Object.keys(restLabels);

        return (
          <div className="flex flex-col gap-1 mt-1 sm:mt-2 w-full">
            <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1">
              {restKeys.map((key) => (
                <div key={key} className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <span
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[key] }}
                  />
                  <span className="text-[10px] sm:text-[11px] text-gray-600 truncate">
                    {statusLabels[key]} <span className="text-gray-400">({bucket?.[key] ?? 0})</span>
                  </span>
                </div>
              ))}
            </div>

            {completed && (
              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                <span
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS.completed }}
                />
                <span className="text-[10px] sm:text-[11px] text-gray-600">
                  {completed} <span className="text-gray-400">({bucket?.completed ?? 0})</span>
                </span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function DistributionTab({ entity, onReady }) {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const firedRef = useRef(false);
  const isApprover = data?.is_approver ?? true;
  const statusLabels = getStatusLabels(isApprover);
  const { auth } = usePage().props;
  const cfg = ENTITY_CONFIG[entity];

  useEffect(() => {
    setLoading(true);
    axios
      .get(route("customers.distribution-stats"), { params: { period } })
      .then((res) => setData(res.data))
      .catch((err) => console.error("Failed to load distribution stats", err))
      .finally(() => {
        setLoading(false);
        if (!firedRef.current) {
          firedRef.current = true;
          onReady?.();
        }
      });
  }, [period]);

  const goToEntity = (key) => {
    let url;
    if (key === "pending") {
      url = isApprover ? route(cfg.routeCurrent, { mine: 1 }) : route(cfg.routeCurrent);
    } else if (key === "pending_projects") {
      url = auth?.user?.id
        ? route(cfg.routeCurrent, { prepared_by_user_id: auth.user.id })
        : route(cfg.routeCurrent);
    } else {
      url = route(cfg.routeArchive, { status: key === "completed" ? "approved" : key });
    }
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
              className={`text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 border rounded-full transition-colors ${
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

      <div className="flex flex-1">
        <DistributionDonut
          title={cfg.label}
          bucket={data?.[entity]}
          loading={loading}
          onSliceClick={goToEntity}
          statusLabels={statusLabels}
        />
      </div>
    </div>
  );
}

function TrendTab({ entity }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const cfg = ENTITY_CONFIG[entity];

  useEffect(() => {
    axios
      .get(route("customers.entries-by-month"))
      .then((res) => setSeries(res.data))
      .catch((err) => console.error("Failed to load entries-by-month", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1 mt-5 sm:mt-6 xl:mt-8">
      <div className="relative w-full h-[235px] sm:h-[250px] xl:h-[275px]">
        {loading ? (
          <div className="absolute inset-0 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <BarChart
            style={{ width: "100%", height: "100%" }}
            responsive
            data={series}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar
              dataKey={entity}
              name={cfg.label}
              fill={cfg.color}
              radius={[4, 4, 0, 0]}
              animationDuration={900}
              animationMatchBy={matchByDataKey("month")}
            />
          </BarChart>
        )}
      </div>
    </div>
  );
}

function ApprovalsTab({ entity, approvals, loading, subTab }) {
  const cfg = ENTITY_CONFIG[entity];

  if (loading) {
    return (
      <div className="flex flex-col gap-3 mt-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const items = subTab === "approvals"
    ? approvals?.[`${entity}_pending`] ?? []
    : approvals?.[`${entity}_mine`] ?? [];

  const href = subTab === "approvals"
    ? route(cfg.routeCurrent)
    : route(cfg.routeCurrent, { mine: 1 });

  const visibleItems = Array.isArray(items) ? items.slice(0, MAX_VISIBLE) : [];
  const hasMore = Array.isArray(items) && items.length > MAX_VISIBLE;

  return (
    <div className="flex flex-col gap-5 mt-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            
            <span className="text-[9px] sm:text-[10px] font-medium px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
              {items.length} Pending
            </span>
          </div>

          {hasMore && (
            <Link href={href} className="text-xs font-medium text-blue-600 hover:underline">
              Show all
            </Link>
          )}
        </div>

        {visibleItems.length === 0 ? (
          <p className="text-xs text-center text-black/40 italic"></p>
        ) : (
          <div className="flex flex-col px-1 sm:px-2.5">
            {visibleItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-2 py-1.5 -mx-2 px-2 rounded-2xl transition-colors border border-transparent hover:border-emerald-700"
              >
                <div className="flex flex-col min-w-0">
                  {item.is_group && (
                    <span className="text-[8px] sm:text-[9px] font-semibold text-purple-600 tracking-wide truncate">
                      {item.entry_count} entries
                    </span>
                  )}
                  <span className="text-[11px] sm:text-xs text-gray-800 font-medium truncate py-0.5">{item.company_name}</span>
                  <span className="text-[10px] sm:text-[11px] text-black/50 truncate">{item.prepared_by}</span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap flex-shrink-0">
                  {item.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PendingApprovalsPanel({ entity = "roi", onReady }) {
  const [activeTab, setActiveTab] = useState("distribution");
  const [pendingSubTab, setPendingSubTab] = useState("approvals");
  const [approvals, setApprovals] = useState(null);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const cfg = ENTITY_CONFIG[entity];

  useEffect(() => {
    axios
      .get(route("customers.pending-approvals"))
      .then((res) => setApprovals(res.data))
      .catch((err) => console.error("Failed to load pending approvals", err))
      .finally(() => setApprovalsLoading(false));
  }, []);

  return (
    <div className="bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/50 rounded-lg shadow-[0px_4px_4px_1px_rgba(0,_0,_0,_0.1)] px-3 py-4 sm:p-4 xl:p-5 flex flex-col h-auto min-h-[345px] sm:h-[420px] xl:h-[445px]">
      <h2 className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold text-gray-800">
        <FaRegFileAlt />{cfg.label} Action Center
      </h2>

      <div className="flex flex-col flex-1">
        {activeTab === "distribution" && <DistributionTab entity={entity} onReady={onReady} />}
        {activeTab === "trend" && <TrendTab entity={entity} />}
        {activeTab === "approvals" && (
          <>
            <div className="flex justify-end -mt-4 lg:-mt-6">
              <div className="inline-flex gap-1 rounded-full">
                {PENDING_SUBTABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setPendingSubTab(t.key)}
                    className={`text-[9px] sm:text-[10px] font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 border rounded-full transition-colors ${
                      pendingSubTab === t.key
                        ? "bg-sky-500 text-white font-semibold shadow"
                        : "text-gray-500 hover:text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <ApprovalsTab entity={entity} approvals={approvals} loading={approvalsLoading} subTab={pendingSubTab} />
          </>
        )}
      </div>

      <div className="relative grid grid-cols-3 p-1 shadow-inner mt-4 sm:mt-6 xl:mt-8 border w-fit mx-auto border-gray-100 rounded-2xl bg-white">
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
              className={`relative z-10 flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-1 sm:py-1.5 rounded-2xl transition-colors duration-300 ${
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