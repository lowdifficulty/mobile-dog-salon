"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { RouteMapPoint } from "@/lib/scheduling/daily-route";
import "leaflet/dist/leaflet.css";

interface GroomerRouteTileMapProps {
  points: RouteMapPoint[];
  path: { lat: number; lon: number }[];
}

function depotIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:#1B3A6E;color:#fff;font:bold 12px/30px sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">S</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function stopIcon(order: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:#FF3D9A;color:#fff;font:bold 12px/30px sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${order}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FitRouteBounds({
  points,
  path,
}: {
  points: RouteMapPoint[];
  path: { lat: number; lon: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    const coords = [
      ...path.map((point) => [point.lat, point.lon] as [number, number]),
      ...points.map((point) => [point.lat, point.lon] as [number, number]),
    ];
    if (!coords.length) return;
    map.fitBounds(L.latLngBounds(coords), { padding: [36, 36] });
  }, [map, points, path]);

  return null;
}

export default function GroomerRouteTileMap({ points, path }: GroomerRouteTileMapProps) {
  const polyline = path.map((point) => [point.lat, point.lon] as [number, number]);
  const center = points[0]
    ? ([points[0].lat, points[0].lon] as [number, number])
    : ([33.67, -117.82] as [number, number]);

  return (
    <MapContainer
      center={center}
      zoom={11}
      className="h-full w-full"
      scrollWheelZoom
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitRouteBounds points={points} path={path} />
      {polyline.length > 1 && (
        <>
          <Polyline positions={polyline} pathOptions={{ color: "#1B3A6E", weight: 7, opacity: 0.2 }} />
          <Polyline positions={polyline} pathOptions={{ color: "#00B4F0", weight: 4, opacity: 0.95 }} />
        </>
      )}
      {points.map((point) => (
        <Marker
          key={`${point.kind}-${point.order ?? "depot"}`}
          position={[point.lat, point.lon]}
          icon={point.kind === "depot" ? depotIcon() : stopIcon(point.order ?? 0)}
        >
          <Popup>
            <strong>{point.kind === "depot" ? "Start / End" : `Stop ${point.order}`}</strong>
            <br />
            {point.label}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
