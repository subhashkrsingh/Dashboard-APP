import { memo, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { geoCentroid } from "d3-geo";
import { scaleLinear } from "d3-scale";
import { motion } from "framer-motion";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

import { formatPercent } from "../../lib/formatters";
import { Badge } from "../ui/Badge";
import { formatResidexValue, useResidexContext, type ResidexQuarterFilter } from "./ResidexContext";

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

type IndexType = "Overall" | "Affordable" | "Premium";

function NSEMapComponent() {
  const navigate = useNavigate();
  const { mapCityPoints, filters, setCity, setActiveTab, periods, selectedPeriod, setQuarter } = useResidexContext();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedIndexType, setSelectedIndexType] = useState<IndexType>("Overall");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dynamic color scale for heatmap
  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([150, 250, 400])
      .range(["#ef4444", "#facc15", "#22c55e"]);
  }, []);

  // Get available quarters for selector
  const availableQuarters = useMemo(() => {
    return periods.map(period => period.label);
  }, [periods]);

  const currentQuarter = selectedPeriod?.label || availableQuarters[availableQuarters.length - 1] || "Q1-2026";

  // Process marker data based on selected index type
  const markerData = useMemo(() => {
    const valueByCity = new Map(mapCityPoints.map(point => [point.city, point]));

    return RESIDEX_CITY_COORDINATES.map(city => {
      const point = valueByCity.get(city.city);
      let value = 0;
      let qoq = 0;
      let yoy = 0;

      if (point) {
        switch (selectedIndexType) {
          case "Affordable":
            value = point.residex * 0.85; // Mock affordable index
            break;
          case "Premium":
            value = point.residex * 1.15; // Mock premium index
            break;
          default:
            value = point.residex;
        }
        qoq = point.qoq;
        yoy = point.yoy;
      }

      return {
        ...city,
        residex: value,
        qoq,
        yoy
      };
    });
  }, [mapCityPoints, selectedIndexType]);

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
    navigate(`/residex/${encodeURIComponent(city.toLowerCase())}`);
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
    <section className="glass-card rounded-2xl border border-slate-800 bg-slate-950/90 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">
            India RESIDEX Heatmap
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            City-wise Residential Price Index
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Quarter Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Quarter:</span>
            <select
              value={currentQuarter}
              onChange={(e) => setQuarter(e.target.value as ResidexQuarterFilter)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="Latest">Latest</option>
              {availableQuarters.map(quarter => (
                <option key={quarter} value={quarter}>
                  {quarter}
                </option>
              ))}
            </select>
          </div>

          {/* Index Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Index:</span>
            <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-1">
              {(["Overall", "Affordable", "Premium"] as IndexType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedIndexType(type)}
                  className={`rounded px-3 py-1 text-sm font-medium transition ${
                    selectedIndexType === type
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.08), transparent 28%),
            radial-gradient(circle at 80% 10%, rgba(16, 185, 129, 0.07), transparent 24%),
            linear-gradient(180deg, #0f172a 0%, #020617 100%)
          `
        }}
      >
        {/* Current Selection Info */}
        <div className="absolute right-4 top-4 z-10 rounded-xl border border-slate-700/50 bg-slate-900/90 px-4 py-3 text-sm shadow-lg backdrop-blur">
          <p className="text-xs uppercase tracking-wider text-slate-400">Selected Focus</p>
          <p className="mt-1 font-semibold text-white">{activeCity ?? "All Cities"}</p>
          <p className="text-xs text-slate-500">
            {hoveredState ? `Hovering ${hoveredState}` : "Hover markers for details"}
          </p>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute z-20 rounded-xl border border-slate-700/50 bg-slate-900/95 px-4 py-3 text-sm shadow-xl backdrop-blur"
            style={{
              left: Math.min(Math.max(tooltip.x + 18, 18), 720),
              top: Math.max(tooltip.y - 18, 18)
            }}
          >
            <p className="font-semibold text-white">{tooltip.city}</p>
            <p className="mt-1 text-xs text-slate-300">
              Index: {formatResidexValue(tooltip.residex)}
            </p>
            <div className="mt-2 flex gap-3 text-xs">
              <span className={tooltip.qoq >= 0 ? "text-emerald-400" : "text-red-400"}>
                QoQ {formatPercent(tooltip.qoq)}
              </span>
              <span className={tooltip.yoy >= 0 ? "text-emerald-400" : "text-red-400"}>
                YoY {formatPercent(tooltip.yoy)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Map */}
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
                      geo.properties?.NAME_1 ?? geo.properties?.st_nm ?? geo.properties?.name ?? "State"
                    );

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => setHoveredState(stateName)}
                        onMouseLeave={() => setHoveredState(null)}
                        onClick={() => handleStateClick(geo)}
                        style={{
                          default: {
                            fill: hoveredState === stateName ? "#1e293b" : "#0f172a",
                            stroke: "#334155",
                            strokeWidth: 0.5,
                            outline: "none"
                          },
                          hover: {
                            fill: "#1e293b",
                            stroke: "#475569",
                            strokeWidth: 0.8,
                            outline: "none"
                          },
                          pressed: {
                            fill: "#334155",
                            stroke: "#64748b",
                            strokeWidth: 1,
                            outline: "none"
                          }
                        }}
                        className="cursor-pointer transition-all duration-300"
                      />
                    );
                  })}

                  {markerData.map(city => {
                    const isActive = activeCity === city.city;
                    const markerColor = colorScale(city.residex);
                    const markerSize = Math.max(4, Math.min(12, city.residex / 30)); // Size based on value

                    return (
                      <Marker key={city.city} coordinates={[city.lng, city.lat]}>
                        <g
                          className="cursor-pointer"
                          onMouseEnter={event => updateTooltip(event, city)}
                          onMouseMove={event => updateTooltip(event, city)}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => handleSelectCity(city.city)}
                        >
                          {/* Glowing outer ring */}
                          <motion.circle
                            r={markerSize + 6}
                            fill={markerColor}
                            fillOpacity={0.1}
                            stroke={markerColor}
                            strokeWidth={1}
                            strokeOpacity={0.3}
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 2,
                              ease: "easeInOut"
                            }}
                          />

                          {/* Main marker */}
                          <motion.circle
                            r={markerSize}
                            fill={markerColor}
                            stroke={isActive ? "#ffffff" : markerColor}
                            strokeWidth={isActive ? 2 : 1}
                            animate={isActive ? {
                              scale: [1, 1.1, 1],
                              opacity: [1, 0.8, 1]
                            } : {}}
                            transition={{
                              repeat: isActive ? Infinity : 0,
                              duration: 1.5,
                              ease: "easeInOut"
                            }}
                            className="transition-all duration-300"
                          />

                          {/* Inner highlight */}
                          <circle
                            r={markerSize * 0.3}
                            fill="#ffffff"
                            fillOpacity={0.8}
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

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-10 rounded-xl border border-slate-700/50 bg-slate-900/90 px-4 py-3 text-sm shadow-lg backdrop-blur">
          <p className="mb-2 text-xs font-medium text-slate-300">Index Range</p>
          <div className="flex items-center gap-3">
            <div className="h-3 w-24 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
            <div className="flex flex-col text-xs text-slate-400">
              <span>Low &lt; 200</span>
              <span>Medium 200-300</span>
              <span>High &gt; 300</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Haversine distance calculation (same as original)
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

export const NSEMap = memo(NSEMapComponent);