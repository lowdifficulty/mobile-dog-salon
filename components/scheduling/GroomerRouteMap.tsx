"use client";

import type { RouteMapPoint } from "@/lib/scheduling/daily-route";

interface GroomerRouteMapProps {
  points: RouteMapPoint[];
  path: { lat: number; lon: number }[];
}

function projectPoints(
  path: { lat: number; lon: number }[],
  points: RouteMapPoint[],
  width: number,
  height: number,
  padding: number
) {
  const all = [
    ...path,
    ...points.map((point) => ({ lat: point.lat, lon: point.lon })),
  ];
  const lats = all.map((point) => point.lat);
  const lons = all.map((point) => point.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lonSpan = Math.max(maxLon - minLon, 0.01);

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const project = (lat: number, lon: number) => ({
    x: padding + ((lon - minLon) / lonSpan) * innerWidth,
    y: padding + ((maxLat - lat) / latSpan) * innerHeight,
  });

  return {
    path: path.map((point) => project(point.lat, point.lon)),
    points: points.map((point) => ({
      ...point,
      ...project(point.lat, point.lon),
    })),
  };
}

function pathD(coords: { x: number; y: number }[]): string {
  if (!coords.length) return "";
  return coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export default function GroomerRouteMap({ points, path }: GroomerRouteMapProps) {
  const width = 640;
  const height = 320;
  const padding = 36;
  const projected = projectPoints(path, points, width, height, padding);
  const line = pathD(projected.path);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">Route map</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Depot → clients in time order → back to depot
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 shrink-0">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-brand inline-block" aria-hidden />
            Depot
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" aria-hidden />
            Stop
          </span>
        </div>
      </div>

      <div className="bg-brand-light/40 p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Map showing driving route from depot through each client and back"
        >
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1B3A6E" />
              <stop offset="100%" stopColor="#00B4F0" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width={width} height={height} fill="#EAF8FF" rx="12" />

          {line && (
            <>
              <path
                d={line}
                fill="none"
                stroke="#1B3A6E"
                strokeOpacity="0.15"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={line}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {projected.points.map((point) => {
            const isDepot = point.kind === "depot";
            const radius = isDepot ? 11 : 13;
            return (
              <g key={`${point.kind}-${point.order ?? "depot"}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius + 4}
                  fill="white"
                  stroke={isDepot ? "#1B3A6E" : "#FF3D9A"}
                  strokeWidth="2"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill={isDepot ? "#1B3A6E" : "#FF3D9A"}
                />
                <text
                  x={point.x}
                  y={point.y + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="white"
                >
                  {isDepot ? "S" : point.order}
                </text>
                <text
                  x={point.x}
                  y={point.y + radius + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#1B3A6E"
                >
                  {isDepot ? "Start / End" : point.label.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
