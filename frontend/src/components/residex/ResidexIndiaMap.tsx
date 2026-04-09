import { memo, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { geoCentroid } from "d3-geo";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

import { formatPercent } from "../../lib/formatters";
import { Badge } from "../ui/Badge";
import { formatResidexValue, useResidexContext } from "./ResidexContext";

const INDIA_MAP_URL = "/maps/india-full.geojson";

const RESIDEX_CITY_COORDINATES = [
  { city: "Delhi", lat: 28.7041, lng: 77.1025 },
  { city: "Mumbai", lat: 19.076, lng: 72.8777 },
  { city: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { city: "Chennai", lat: 13.0827, lng: 80.2707 },
  { city: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { city: "Pune", lat: 18.5204, lng: 73.8567 },
  { city: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { city: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { city: "Kochi", lat: 9.9312, lng: 76.2673 },
  { city: "Bhopal", lat: 23.2599, lng: 77.4126 }
] as const;

interface TooltipState {
  city: string;
  qoq: number;
  yoy: number;
  residex: number;
  x: number;
  y: number;
}

function getMarkerColor(value: number) {
  if (value <= 200) {
    return "#dc2626";
  }

  if (value >= 300) {
    return "#16a34a";
  }

  const ratio = (value - 200) / 100;
  const red = Math.round(234 - ratio * 90);
  const green = Math.round(179 + ratio * 30);
  const blue = Math.round(8 + ratio * 40);
  return `rgb(${red}, ${green}, ${blue})`;
}

function haversineDistance(
  left: { lat: number; lng: number },
  right: { lat: number; lng: number }
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRadians(right.lat - left.lat);
  const dLng = toRadians(right.lng - left.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(left.lat)) *
      Math.cos(toRadians(right.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ResidexIndiaMapComponent() {
  const { mapCityPoints, filters, setCity, setActiveTab } = useResidexContext();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeStateName, setActiveStateName] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const markerData = useMemo(() => {
    const valueByCity = new Map(mapCityPoints.map(point => [point.city, point]));

    return RESIDEX_CITY_COORDINATES.map(city => {
      const point = valueByCity.get(city.city);
      return {
        ...city,
        residex: point?.residex ?? 0,
        qoq: point?.qoq ?? 0,
        yoy: point?.yoy ?? 0
      };
    });
  }, [mapCityPoints]);

  const activeCity = filters.city === "All" ? null : filters.city;

  function updateTooltip(
    event: ReactMouseEvent<SVGElement | HTMLButtonElement>,
    point: { city: string; residex: number; qoq: number; yoy: number }
  ) {
    const bounds = containerRef.current?.getBoundingClientRect();

    setTooltip({
      city: point.city,
      residex: point.residex,
      qoq: point.qoq,
      yoy: point.yoy,
      x: bounds ? event.clientX - bounds.left : 0,
      y: bounds ? event.clientY - bounds.top : 0
    });
  }

  function handleSelectCity(city: string) {
    setCity(city);
    setActiveTab("cities");

    window.requestAnimationFrame(() => {
      document.getElementById("cities")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function handleStateClick(geo: { properties?: Record<string, unknown>; geometry?: unknown }) {
    const centroid = geoCentroid(geo as never);
    const nearestCity = markerData.reduce<(typeof markerData)[number] | null>((closest, city) => {
      const distance = haversineDistance(
        { lat: centroid[1], lng: centroid[0] },
        { lat: city.lat, lng: city.lng }
      );

      if (!closest) {
        return city;
      }

      const closestDistance = haversineDistance(
        { lat: centroid[1], lng: centroid[0] },
        { lat: closest.lat, lng: closest.lng }
      );

      return distance < closestDistance ? city : closest;
    }, null);

    if (nearestCity) {
      handleSelectCity(nearestCity.city);
    }
  }

  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="card-title text-xs text-blue-700">Interactive Geography</p>
          <h3 className="section-title mt-2 font-display text-xl">
            India RESIDEX Map
          </h3>
          <p className="subtle-text mt-1">
            Click any state to jump to the nearest tracked RESIDEX city, or click a city marker to update the dashboard instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="negative">Low &lt; 200</Badge>
          <Badge tone="warning">Medium 200-300</Badge>
          <Badge tone="positive">High &gt; 300</Badge>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.08),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.07),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-3 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]"
      >
        <div className="absolute right-4 top-4 z-10 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100">
          <p className="card-title text-[11px] tracking-[0.2em]">Selected Focus</p>
          <p className="mt-1 font-semibold">{activeCity ?? "All Cities"}</p>
          <p className="subtle-text text-xs">
            {activeStateName ? `Hovering ${activeStateName}` : "Hover a marker for index stats"}
          </p>
        </div>

        {tooltip ? (
          <div
            className="pointer-events-none absolute z-20 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-[0_14px_30px_rgba(15,23,42,0.14)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
            style={{
              left: Math.min(Math.max(tooltip.x + 18, 18), 720),
              top: Math.max(tooltip.y - 18, 18)
            }}
          >
            <p className="font-semibold text-slate-900">{tooltip.city}</p>
            <p className="subtle-text mt-1 text-xs">
              RESIDEX {formatResidexValue(tooltip.residex)}
            </p>
            <div className="mt-2 flex gap-3 text-xs">
              <span className={tooltip.qoq >= 0 ? "text-emerald-600" : "text-rose-600"}>QoQ {formatPercent(tooltip.qoq)}</span>
              <span className={tooltip.yoy >= 0 ? "text-emerald-600" : "text-rose-600"}>YoY {formatPercent(tooltip.yoy)}</span>
            </div>
          </div>
        ) : null}

        <div className="h-[560px] w-full">
          <ComposableMap
            width={900}
            height={700}
            projection="geoMercator"
            projectionConfig={{ scale: 1000, center: [82, 23] }}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={INDIA_MAP_URL}>
              {({ geographies }) => (
                <>
                  {geographies.map(geo => {
                    const stateName = String(
                      geo.properties.NAME_1 ?? geo.properties.st_nm ?? geo.properties.name ?? "State"
                    );

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => setActiveStateName(stateName)}
                        onMouseLeave={() => setActiveStateName(current => (current === stateName ? null : current))}
                        onClick={() => handleStateClick(geo)}
                        style={{
                          default: {
                            fill: activeStateName === stateName ? "#bfdbfe" : "#dbeafe",
                            stroke: "#94a3b8",
                            strokeWidth: 0.7,
                            outline: "none"
                          },
                          hover: {
                            fill: "#93c5fd",
                            stroke: "#3b82f6",
                            strokeWidth: 1,
                            outline: "none"
                          },
                          pressed: {
                            fill: "#60a5fa",
                            stroke: "#2563eb",
                            strokeWidth: 1.2,
                            outline: "none"
                          }
                        }}
                        className="cursor-pointer transition"
                      />
                    );
                  })}

                  {markerData.map(city => {
                    const active = activeCity === city.city;
                    const markerColor = getMarkerColor(city.residex);

                    return (
                      <Marker key={city.city} coordinates={[city.lng, city.lat]}>
                        <g
                          className="cursor-pointer"
                          onMouseEnter={event => updateTooltip(event, city)}
                          onMouseMove={event => updateTooltip(event, city)}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => handleSelectCity(city.city)}
                        >
                          <circle
                            r={active ? 8.5 : 6.5}
                            fill={markerColor}
                            stroke={active ? "#0f172a" : "#ffffff"}
                            strokeWidth={active ? 3 : 2}
                            className="transition-all duration-150"
                          />
                          <circle
                            r={active ? 15 : 11}
                            fill={markerColor}
                            fillOpacity={active ? 0.18 : 0.12}
                            stroke="none"
                          />
                        </g>
                      </Marker>
                    );
                  })}
                </>
              )}
            </Geographies>
          </ComposableMap>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Marker Gradient</span>
          <div className="h-3 w-32 rounded-full bg-[linear-gradient(90deg,#dc2626_0%,#facc15_50%,#16a34a_100%)]" />
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>
    </section>
  );
}

export const ResidexIndiaMap = memo(ResidexIndiaMapComponent);
