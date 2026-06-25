"use client";

import dynamic from "next/dynamic";
import type { RouteMapPoint } from "@/lib/scheduling/daily-route";

const GroomerRouteTileMap = dynamic(() => import("./GroomerRouteTileMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-gray-50 text-sm text-gray-500">
      Loading map…
    </div>
  ),
});

interface GroomerRouteMapProps {
  googleMapsEmbedUrl: string | null;
  points: RouteMapPoint[];
  path: { lat: number; lon: number }[];
}

export default function GroomerRouteMap({
  googleMapsEmbedUrl,
  points,
  path,
}: GroomerRouteMapProps) {
  const usingGoogle = Boolean(googleMapsEmbedUrl);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900">Route map</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {usingGoogle
              ? "Google Maps — depot → clients in time order → back to depot"
              : "Street map — depot → clients in time order → back to depot"}
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

      <div className="relative h-[420px] w-full bg-gray-100">
        {usingGoogle ? (
          <iframe
            title="Google Maps route for the day"
            src={googleMapsEmbedUrl!}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <GroomerRouteTileMap points={points} path={path} />
        )}
      </div>

      {!usingGoogle && (
        <p className="px-4 py-2 text-[11px] text-gray-600 border-t border-gray-100 bg-gray-50">
          Add <code className="text-[10px]">GOOGLE_MAPS_API_KEY</code> on Vercel with{" "}
          <strong>Maps Embed API</strong> enabled for the full Google Maps view.
        </p>
      )}
    </div>
  );
}
