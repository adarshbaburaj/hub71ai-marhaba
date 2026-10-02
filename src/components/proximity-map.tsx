"use client";

import "leaflet/dist/leaflet.css";
import { LocateFixed, MapPin, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { Button } from "@/components/ui/button";
import { buildMapPoints, haversineKm, MAP_CATEGORIES, type InspectKind, type MapCategory, type MapPoint } from "@/lib/map-data";
import type { MoveProfile, Plan } from "@/lib/types";

interface ProximityMapProps {
  profile: MoveProfile;
  plan: Plan | null;
  onInspect?: (value: { kind: InspectKind; id: string }) => void;
}

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const categoryDetails = new Map(MAP_CATEGORIES.map((category) => [category.id, category]));

function popupContent(point: MapPoint, origin: MapPoint, onInspect?: ProximityMapProps["onInspect"]): HTMLElement {
  const popup = document.createElement("div");
  popup.className = "geo-popup";
  const heading = document.createElement("strong");
  heading.textContent = point.name;
  popup.append(heading);
  const role = document.createElement("p");
  role.textContent = point.role ?? categoryDetails.get(point.category)?.label ?? point.category;
  popup.append(role);
  const source = document.createElement("span");
  source.className = "geo-source";
  source.textContent = point.source;
  popup.append(source);
  const detail = document.createElement("p");
  detail.textContent = point.description;
  popup.append(detail);
  const distance = document.createElement("p");
  distance.textContent = point.id === origin.id ? "Map reference point" : `${haversineKm(origin, point).toFixed(1)} km straight-line from ${origin.category === "home" ? "home" : "the reference workplace"}. This is not a route or journey time.`;
  popup.append(distance);
  const coordinates = document.createElement("small");
  coordinates.textContent = `Approximate pin: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
  popup.append(coordinates);
  if (point.sourceUrl) {
    const link = document.createElement("a");
    link.href = point.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Official address source ↗";
    popup.append(link);
  }
  if (point.inspectKind && point.inspectId && onInspect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-outline button-sm";
    button.textContent = "View planning card";
    const kind = point.inspectKind;
    const id = point.inspectId;
    button.addEventListener("click", () => onInspect({ kind, id }));
    popup.append(button);
  }
  return popup;
}

function PlainMap({ points, origin, onSelect }: { points: MapPoint[]; origin: MapPoint; onSelect: (point: MapPoint) => void }) {
  const minLng = Math.min(...points.map((point) => point.lng)) - 0.004;
  const maxLng = Math.max(...points.map((point) => point.lng)) + 0.004;
  const minLat = Math.min(...points.map((point) => point.lat)) - 0.004;
  const maxLat = Math.max(...points.map((point) => point.lat)) + 0.004;
  const position = (point: MapPoint) => ({ x: 30 + (point.lng - minLng) / (maxLng - minLng) * 640, y: 350 - (point.lat - minLat) / (maxLat - minLat) * 300 });
  const start = position(origin);
  return <div className="plain-proximity-map">
    <svg viewBox="0 0 700 380" role="img" aria-label="Simple geographic relationship diagram; background tiles unavailable">
      <rect width="700" height="380" fill="#edf3f4" />
      <path d="M0 95 H700 M0 190 H700 M0 285 H700 M175 0 V380 M350 0 V380 M525 0 V380" stroke="#d9e4e6" />
      {points.filter((point) => point.id !== origin.id).map((point) => { const end = position(point); return <line key={`line-${point.id}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={categoryDetails.get(point.category)?.color} strokeWidth="2" strokeDasharray="6 5" opacity="0.6" />; })}
      {points.map((point) => { const positionValue = position(point); const category = categoryDetails.get(point.category)!; return <g key={point.id} transform={`translate(${positionValue.x}, ${positionValue.y})`} role="button" tabIndex={0} aria-label={`${point.name}, ${category.label}, ${point.source}`} onClick={() => onSelect(point)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(point); } }}><circle r={point.id === origin.id ? 16 : 12} fill={category.color} stroke="white" strokeWidth="3" /><text textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" fontWeight="700">{category.symbol}</text></g>; })}
      <text x="20" y="365" fill="#56656b" fontSize="12">Approximate geographic pins · straight-line connections</text>
    </svg>
  </div>;
}

export default function ProximityMap({ profile, plan, onInspect }: ProximityMapProps) {
  const prepared = useMemo(() => buildMapPoints(profile, plan), [profile, plan]);
  const [enabled, setEnabled] = useState<Set<MapCategory>>(() => new Set(MAP_CATEGORIES.map((category) => category.id)));
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [tileErrors, setTileErrors] = useState(0);
  const [hasTiles, setHasTiles] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const libraryRef = useRef<typeof Leaflet | null>(null);
  const markersRef = useRef<Map<string, Leaflet.Marker>>(new Map());
  const inspectRef = useRef(onInspect);
  const inspectionEnabled = Boolean(onInspect);
  const visiblePoints = useMemo(() => prepared.points.filter((point) => point.id === prepared.origin.id || enabled.has(point.category)), [prepared, enabled]);

  useEffect(() => { inspectRef.current = onInspect; }, [onInspect]);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    import("leaflet").then((library) => {
      if (cancelled || !containerRef.current) return;
      libraryRef.current = library;
      const map = library.map(containerRef.current, { zoomControl: true, attributionControl: true, keyboard: true, scrollWheelZoom: false, minZoom: 9, maxZoom: 18 }).setView([24.4985, 54.3898], 13);
      mapRef.current = map;
      map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      library.tileLayer(TILE_URL, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
        maxZoom: 19,
        updateWhenIdle: true,
        keepBuffer: 1,
        referrerPolicy: "strict-origin-when-cross-origin",
      }).on("tileerror", () => { if (!cancelled) setTileErrors((previous) => previous + 1); }).on("tileload", () => { if (!cancelled) setHasTiles(true); }).addTo(map);
      library.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
      observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
      observer.observe(containerRef.current);
      setLoaded(true);
    }).catch(() => { if (!cancelled) setUnavailable(true); });
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      libraryRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const library = libraryRef.current;
    if (!loaded || !map || !library) return;
    const layer = library.featureGroup().addTo(map);
    const markers = new Map<string, Leaflet.Marker>();
    for (const point of visiblePoints) {
      const category = categoryDetails.get(point.category)!;
      if (point.id !== prepared.origin.id) library.polyline([[prepared.origin.lat, prepared.origin.lng], [point.lat, point.lng]], { color: category.color, weight: 2, opacity: 0.55, dashArray: "5 7", interactive: false }).addTo(layer);
      const isOrigin = point.id === prepared.origin.id;
      const icon = library.divIcon({
        className: "geo-marker-wrapper",
        html: `<span class="geo-marker ${isOrigin ? "geo-marker-origin" : ""}" style="background:${category.color}">${category.symbol}</span>`,
        iconSize: [isOrigin ? 38 : 30, isOrigin ? 38 : 30], iconAnchor: [isOrigin ? 19 : 15, isOrigin ? 19 : 15], popupAnchor: [0, -17],
      });
      const marker = library.marker([point.lat, point.lng], { icon, keyboard: true, title: point.name, alt: `${point.name}, ${category.label}` }).addTo(layer);
      marker.bindPopup(popupContent(point, prepared.origin, inspectionEnabled ? (value) => inspectRef.current?.(value) : undefined), { maxWidth: 290, minWidth: 190 });
      marker.getElement()?.setAttribute("aria-label", `${point.name}, ${category.label}, ${point.source}`);
      marker.on("click", () => setSelectedPoint(point));
      markers.set(point.id, marker);
    }
    markersRef.current = markers;
    map.fitBounds(layer.getBounds(), { padding: [38, 38], maxZoom: 15, animate: false });
    return () => { map.removeLayer(layer); markers.clear(); };
  }, [loaded, visiblePoints, prepared.origin, inspectionEnabled]);

  function fit() {
    const map = mapRef.current;
    const library = libraryRef.current;
    if (map && library) map.fitBounds(library.latLngBounds(visiblePoints.map((point) => [point.lat, point.lng] as [number, number])), { padding: [38, 38], maxZoom: 15 });
  }

  function select(point: MapPoint) {
    setSelectedPoint(point);
    mapRef.current?.setView([point.lat, point.lng], 15, { animate: true });
    markersRef.current.get(point.id)?.openPopup();
  }

  const missingTiles = tileErrors >= 3 && !hasTiles;
  const activeSelection = selectedPoint && visiblePoints.some((point) => point.id === selectedPoint.id) ? selectedPoint : null;

  return <section className="proximity-map" aria-label="Your Abu Dhabi proximity map">
    <div className="geo-map-toolbar"><div><span className="eyebrow">YOUR DAILY WORLD</span><h3>See how life connects</h3><p>{prepared.originLabel}. Pin positions are approximate.</p></div><Button variant="outline" size="sm" onClick={fit} disabled={!loaded || unavailable}><Maximize2 size={14} /> Fit places</Button></div>
    <div className="geo-map-filters" aria-label="Map categories">
      {MAP_CATEGORIES.map((category) => <button key={category.id} type="button" className="geo-filter" aria-pressed={enabled.has(category.id)} onClick={() => setEnabled((previous) => { const next = new Set(previous); if (next.has(category.id)) next.delete(category.id); else next.add(category.id); return next; })}><span className="geo-legend-dot" style={{ background: category.color }} />{category.label}</button>)}
    </div>
    <p className="geo-map-caption">Colored dotted lines show straight-line proximity, never a road route or travel time. The reference pin stays visible.</p>
    {unavailable ? <PlainMap points={visiblePoints} origin={prepared.origin} onSelect={select} /> : <div ref={containerRef} role="region" tabIndex={0} className={`geo-map-canvas ${missingTiles ? "geo-map-without-tiles" : ""}`} style={{ minHeight: 390, width: "100%", position: "relative", zIndex: 0, background: "#edf3f4" }} aria-label="Interactive map: drag to pan; use plus and minus controls or keyboard to zoom" />}
    {!loaded && !unavailable && <p className="geo-map-status" role="status">Loading the map. The places below are available now.</p>}
    {(missingTiles || unavailable) && <p className="geo-map-status" role="status">Street tiles are unavailable. Approximate pins, distances and the places list still work.</p>}
    {activeSelection && <div className="geo-map-selection"><MapPin size={16} /><div><strong>{activeSelection.name}</strong><p>{activeSelection.description}</p></div><button type="button" className="geo-dismiss" onClick={() => setSelectedPoint(null)} aria-label="Dismiss selected map place">×</button></div>}
    <div className="geo-map-places"><h4>Places in this view <span>{visiblePoints.length}</span></h4><ul>
      {visiblePoints.map((point) => { const category = categoryDetails.get(point.category)!; return <li key={point.id} className="geo-place"><span className="geo-place-symbol" style={{ background: category.color }} aria-hidden="true">{category.symbol}</span><div><button className="geo-place-name" type="button" onClick={() => select(point)}>{point.name}<LocateFixed size={12} aria-hidden="true" /></button><p>{point.role ?? category.label} · {point.id === prepared.origin.id ? "Reference point" : `${haversineKm(prepared.origin, point).toFixed(1)} km straight-line`}</p><small>{point.source}{point.category === "school" || point.category === "transit" ? " · School-bus coverage needs separate confirmation" : ""}</small>{point.sourceUrl && <a href={point.sourceUrl} target="_blank" rel="noopener noreferrer">Official address ↗</a>}</div>{point.inspectKind && point.inspectId && onInspect && <Button variant="ghost" size="sm" onClick={() => onInspect({ kind: point.inspectKind!, id: point.inspectId! })} aria-label={`View ${point.name} planning card`}>View card</Button>}</li>; })}
    </ul></div>
    <p className="geo-map-footer">Base map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · <a href="https://operations.osmfoundation.org/policies/tiles/" target="_blank" rel="noopener noreferrer">Tile usage policy</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Report a base-map issue</a>. Demo pins do not identify real homes, schools or local services.</p>
  </section>;
}
