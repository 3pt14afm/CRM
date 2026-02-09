import React from "react";

export default function StatCard({
  icon: Icon,
  title,
  value,
  percent,
  theme,
  index = 0,
}) {
  const clipId = `bgblur_${index}`;

  return (
    <div
      className={`relative overflow-hidden px-5 py-3 ${theme.bg} rounded-lg shadow-[0px_4px_4px_1px_rgba(0,_0,_0,_0.1)] flex flex-col items-start`}
    >
      {/* Decoration */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
        {/* BACK Layer */}
        <svg
          className="absolute top-0 right-0"
          width="67"
          height="66"
          viewBox="0 0 67 66"
          fill="none"
        >
          <path
            d="M67 65.5C29.9969 65.5 0 36.1747 0 0C0 0 24.7393 0 56.9985 0C62.5214 0 67 4.47715 67 10V65.5Z"
            fill={theme.svgBack}
            fillOpacity="0.05"
          />
        </svg>

        {/* FRONT Layer */}
        <svg
          className="absolute top-0 right-0"
          width="49"
          height="48"
          viewBox="0 0 49 48"
          fill="none"
        >
          <foreignObject x="-4" y="-4" width="57" height="56">
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                backdropFilter: "blur(2px)",
                clipPath: `url(#${clipId})`,
                height: "100%",
                width: "100%",
              }}
            />
          </foreignObject>

          <path
            d="M49 48C42.5652 48 36.1935 46.7584 30.2485 44.3462C24.3036 41.934 18.9018 38.3983 14.3518 33.9411C9.80169 29.4839 6.19238 24.1924 3.7299 18.3688C1.26742 12.5452 -5.62546e-07 6.30345 0 0L39 3.33991e-06C44.5228 3.81288e-06 49 4.47716 49 10L49 48Z"
            fill={theme.svgFill}
            fillOpacity="0.1"
          />
          <defs>
            <clipPath id={clipId} transform="translate(4 4)">
              <path d="M49 48C42.5652 48 36.1935 46.7584 30.2485 44.3462C24.3036 41.934 18.9018 38.3983 14.3518 33.9411C9.80169 29.4839 6.19238 24.1924 3.7299 18.3688C1.26742 12.5452 -5.62546e-07 6.30345 0 0L39 3.33991e-06C44.5228 3.81288e-06 49 4.47716 49 10L49 48Z" />
            </clipPath>
          </defs>
        </svg>
      </div>

      {/* Icon */}
      <div
        className={`w-fit mb-2 px-[5px] py-[5px] rounded border flex items-center justify-center ${theme.icon}`}
      >
        <Icon size={17} />
      </div>

      {/* Text */}
      <p className="text-sm text-black font-semibold tracking-wider">
        {title}
      </p>
      <p className="text-4xl font-semibold text-gray-900">
        {Number(value).toLocaleString()}
      </p>

      {!!percent && (
        <p className="text-[11px] text-black/70 mt-1">+{percent}% this month</p>
      )}
    </div>
  );
}
