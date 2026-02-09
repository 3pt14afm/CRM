import React from "react";

const tones = {
  green: {
    bg: "bg-[#289800]/5",
    border: "border-[#289800]/10",
    pillBg: "bg-[#289800]/10",
    pillText: "text-darkgreen",
  },
  orange: {
    bg: "bg-[#FF6500]/5",
    border: "border-[#FF6500]/5",
    pillBg: "bg-orange-100",
    pillText: "text-orange-700",
  },
  sky: {
    bg: "bg-[#74C5FF]/5",
    border: "border-[#74C5FF]/15",
    pillBg: "bg-sky-100",
    pillText: "text-sky-700",
  },
  red: {
    bg: "bg-[#FF0000]/5",
    border: "border-[#FF0000]/5",
    pillBg: "bg-red-100",
    pillText: "text-red-700",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-100",
    pillBg: "bg-purple-100",
    pillText: "text-purple-700",
  },
  gray: {
    bg: "bg-slate-50",
    border: "border-slate-100",
    pillBg: "bg-slate-100",
    pillText: "text-slate-700",
  },
};

function formatValue(value) {
  if (typeof value === "number") return value.toLocaleString();
  return value; // e.g. "516.4M", "₱2.48B"
}

export default function KpiCard({
  title,
  value,
  tone = "gray",
  badgeText, // "5 Urgent", "98% Up", "↑ 5.2%", "-2% Var"
}) {
  const t = tones[tone] ?? tones.gray;

  return (
    <div
      className={[
        "relative rounded-2xl px-6 py-5 min-h-[110px]",
        "border",
        t.bg,
        t.border,
        "shadow-[0px_6px_10px_3px_rgba(0,_0,_0,_0.08)]",
      ].join(" ")}
    >
      <p className="text-[12px] font-semibold text-black">{title}</p>

      <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
        {formatValue(value)}
      </p>

      {badgeText ? (
        <span
          className={[
            "absolute right-5 bottom-5",
            "px-2 py-1 rounded-md text-[10px] font-semibold",
            t.pillBg,
            t.pillText,
          ].join(" ")}
        >
          {badgeText}
        </span>
      ) : null}
    </div>
  );
}
