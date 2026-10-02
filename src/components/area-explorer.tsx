"use client";

import { useId, useState } from "react";
import { Building2, Check, GraduationCap, House, MapPin, ShoppingBasket, Sparkles } from "lucide-react";
import { areas, homes, schools, workplaces } from "@/lib/data";
import { haversineKm, locations, nearbyPoints, type MapPoint } from "@/lib/map-data";
import { travelBetweenAreas } from "@/lib/planner";
import { activeChildAges, schoolChildCount } from "@/lib/profile";
import type { MoveProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./area-explorer.module.css";

interface AreaExplorerProps {
  profile: MoveProfile;
  selectedAreas: string[];
  onToggle: (id: string) => void;
}

const sketchLayers = [
  { id: "food", label: "Shopping", color: "Blue", Icon: ShoppingBasket, path: "M150 48C111 48 113 22 50 22" },
  { id: "work", label: "Work", color: "Red", Icon: Building2, path: "M150 48C189 48 187 22 250 22" },
  { id: "hobbies", label: "Hobbies", color: "Neutral", Icon: Sparkles, path: "M150 48C111 48 113 74 50 74" },
  { id: "school", label: "School", color: "Green", Icon: GraduationCap, path: "M150 48C189 48 187 74 250 74" },
] as const;
type Layer = (typeof sketchLayers)[number]["id"];

export function AreaExplorer({ profile, selectedAreas, onToggle }: AreaExplorerProps) {
  const id = useId();
  const [visible, setVisible] = useState<Record<Layer, boolean>>({ food: true, work: true, hobbies: true, school: true });
  const isReference = profile.business.workspace === "remote" || !profile.business.workplaceId;
  const workplace = workplaces.find((place) => place.id === (!isReference ? profile.business.workplaceId : "harbor-lab")) ?? workplaces[0];
  const origin = locations[workplace.id];
  const anchorName = workplace.id === "harbor-lab" ? "Hub71" : workplace.name;
  const mode = profile.transport.car === "none" ? "public" : "car";
  const commuteLabel = mode === "car" ? "by car" : "by public transport";
  const options = areas.map((area) => {
    const pins = homes.filter((home) => home.areaId === area.id).map((home) => locations[home.id]);
    const center = { lat: pins.reduce((sum, pin) => sum + pin.lat, 0) / pins.length, lng: pins.reduce((sum, pin) => sum + pin.lng, 0) / pins.length };
    return { ...area, distance: haversineKm(origin, center), minutes: travelBetweenAreas(area.id, workplace.areaId, mode) };
  });
  const area = options.find((option) => option.id === selectedAreas.at(-1)) ?? options[0];
  const home = homes.find((home) => home.areaId === area.id && home.bedrooms >= profile.home.bedrooms) ?? homes.find((home) => home.areaId === area.id)!;
  const homePin = locations[home.id];
  const nearest = (points: MapPoint[]) => points.sort((a, b) => haversineKm(homePin, a) - haversineKm(homePin, b))[0];
  const school = nearest(schools.map((school) => locations[school.id]));
  const food = nearest(nearbyPoints.filter((point) => point.areaId === area.id && point.category === "groceries"));
  const leisure = nearbyPoints.filter((point) => point.areaId === area.id && point.category === "leisure");
  const interests = profile.lifestyle.hobbies.map((hobby) => hobby.toLowerCase());
  const matchingHobbies = leisure.filter((point) => point.hobbies?.some((tag) => interests.some((interest) => interest.includes(tag.toLowerCase()) || tag.toLowerCase().includes(interest))));
  const hobbies = nearest(matchingHobbies.length ? matchingHobbies : leisure);
  const points: Record<Layer, MapPoint> = { food, work: origin, hobbies, school };
  const layers = sketchLayers.filter((layer) => layer.id !== "school" || schoolChildCount(profile) > 0);
  const otherCare = activeChildAges(profile).some((age) => age !== null && (age < 5 || age > 18));

  return <aside className={styles.explorer} aria-labelledby={`${id}-title`}>
    <div className={styles.eyebrow}><MapPin size={11} aria-hidden="true" /> YOUR ABU DHABI</div>
    <h3 id={`${id}-title`} className={styles.title}>Life around {anchorName}.</h3>
    <p className={styles.intro}>Choose your shortlist. Area km are from {anchorName}.</p>
    <div className={styles.areas} role="group" aria-label={`Neighbourhoods around ${anchorName}`} aria-describedby={`${id}-note`}>
      {options.map((option) => {
        const selected = selectedAreas.includes(option.id);
        return <button key={option.id} type="button" className={cn(styles.area, selected && styles.selected)} aria-pressed={selected} aria-label={option.name} aria-describedby={`${id}-${option.id}-detail`} onClick={() => onToggle(option.id)}>
          <span className={styles.areaHeading}><span>{option.name}</span><span className={styles.check} aria-hidden="true">{selected ? <Check size={9} strokeWidth={3} /> : "+"}</span></span>
          <span id={`${id}-${option.id}-detail`} className={styles.details}><span><strong>{option.minutes === null ? "Confirm route" : `~${option.minutes} min`}</strong> {commuteLabel}</span><span>{option.distance.toFixed(1)} km<span className={styles.srOnly}> straight-line</span></span></span>
        </button>;
      })}
    </div>
    <div className={styles.snapshotHeading}><strong>{area.name} · sample daily life</strong><span>{selectedAreas.length ? `${selectedAreas.length} shortlisted` : "Preview"}</span></div>
    <div className={styles.layers} role="group" aria-label="Show places in the local sketch">
      {layers.map(({ id: layerId, label, color, Icon }) => <button type="button" key={layerId} aria-pressed={visible[layerId]} className={cn(styles.layer, styles[`${layerId}Connection`], visible[layerId] && styles.layerOn)} title={`${label} · ${color.toLowerCase()} connection from the sample home`} onClick={() => setVisible((current) => ({ ...current, [layerId]: !current[layerId] }))}><Icon size={10} aria-hidden="true" />{label}</button>)}
    </div>
    <div className={styles.legend} aria-label="Connection colors"><span className={styles.workConnection}>Work · red</span>{schoolChildCount(profile) > 0 && <span className={styles.schoolConnection}>School · green</span>}<span className={styles.foodConnection}>Shopping · blue</span></div>
    <div className={styles.diagram} role="group" aria-label={`Illustrative daily life around ${home.name}`} aria-describedby={`${id}-note`}>
      <svg className={styles.connections} viewBox="0 0 300 96" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M0 49C61 20 89 66 143 50C207 23 233 69 300 44" stroke="#EEEAE4" strokeWidth="16" />
        {layers.filter((layer) => visible[layer.id]).map((layer) => <g key={layer.id} data-connection={layer.id === "food" ? "shopping" : layer.id} className={styles[`${layer.id}Connection`]}><path className={styles.branch} d={layer.path} /><path className={styles.routeLight} pathLength="100" d={layer.path} /></g>)}
      </svg>
      <div className={styles.home}><span><House size={11} aria-hidden="true" />Sample home</span><strong>{home.name}</strong></div>
      {layers.filter((layer) => visible[layer.id]).map(({ id: layerId, label, color, Icon }) => {
        const point = points[layerId];
        const minutes = layerId === "school" || layerId === "work" ? travelBetweenAreas(area.id, point.areaId, mode) : null;
        const duration = layerId === "food" || layerId === "hobbies" ? "Allow 10 min" : minutes === null ? "Route to confirm" : `~${minutes} min`;
        return <div key={layerId} className={cn(styles.place, styles[layerId], styles[`${layerId}Connection`])} aria-label={`${label}: ${point.name}. ${color} ${label.toLowerCase()} connection from sample home. ${duration}${minutes !== null ? ` ${commuteLabel}, prepared estimate` : layerId === "food" || layerId === "hobbies" ? ", synthetic allowance" : ""}. ${haversineKm(homePin, point).toFixed(1)} km straight-line. ${layerId === "school" ? "Example school; confirm suitability for each child, admission and transport." : "Illustrative place; confirm actual availability."}`} title={point.name}>
          <strong><Icon size={10} aria-hidden="true" />{label}{layerId === "work" && isReference ? " reference" : layerId === "school" ? " example" : ""}</strong>
          <span>{duration} · {haversineKm(homePin, point).toFixed(1)} km</span>
        </div>;
      })}
    </div>
    <p id={`${id}-note`} className={styles.note}>Local km are straight-line from the sample home. Work/school minutes are prepared; “10 min” is a synthetic allowance. {workplace.id !== "harbor-lab" && <>Hub71 reference: {haversineKm(homePin, locations["harbor-lab"]).toFixed(1)} km from this home. </>}{otherCare ? "Care outside school ages needs a quote. " : ""}Confirm places, routes and school fit.</p>
  </aside>;
}
