"use client";

import { useId, useState } from "react";
import { homes, schools, workplaces } from "@/lib/data";
import { haversineKm, locations, nearbyPoints, type MapPoint } from "@/lib/map-data";
import { activeChildAges, effectiveProfile, hasChild, schoolChildCount } from "@/lib/profile";
import type { MoveProfile, Plan } from "@/lib/types";
import { aed, cn } from "@/lib/utils";
import styles from "./hub-results.module.css";

interface HubResultsProps {
  profile: MoveProfile;
  plan: Plan;
  onInspect?: (value: { kind: "home" | "school" | "workplace"; id: string }) => void;
}
interface Spoke {
  id: string;
  label: string;
  place: string;
  detail: string;
  connection: "work" | "school" | "shopping" | "outdoors" | "care";
  position: "top" | "left" | "right" | "bottom";
  kind?: "home" | "school" | "workplace";
  inspectId?: string;
}

export function HubResults({ profile, plan, onInspect }: HubResultsProps) {
  const id = useId();
  const [hidden, setHidden] = useState<string[]>([]);
  const p = effectiveProfile(profile);
  const home = homes.find(item => item.id === plan.homeId);
  const childCount = schoolChildCount(p);
  const school = hasChild(p) && childCount > 0 ? schools.find(item => item.id === plan.schoolId) : undefined;
  const workplace = workplaces.find(item => item.id === plan.workplaceId);
  const homePoint = locations[plan.homeId];
  const anchorName = workplace ? workplace.id === "harbor-lab" ? "Hub71" : workplace.name : p.business.workspace === "remote" ? "Home office" : "Home base";
  const park = nearbyPoints.find(point => point.areaId === home?.areaId && point.category === "leisure" && point.name.includes("Park"));
  const market = nearbyPoints.find(point => point.areaId === home?.areaId && point.category === "groceries");
  const distanceFromHome = (point?: MapPoint) => point && homePoint ? `${haversineKm(homePoint, point).toFixed(1)} km from home · straight-line` : "Distance to confirm";
  const workPoint = workplace ? locations[workplace.id] : p.business.workspace === "remote" ? homePoint : undefined;
  const workDistance = distanceFromHome(workPoint);
  const proximity = (point?: MapPoint) => {
    if (!point || !homePoint) return "Location to confirm";
    const km = haversineKm(homePoint, point);
    return `${distanceFromHome(point)} · ~${Math.max(5, Math.round(km * 20))} min walk allowance`;
  };
  const founderJourney = plan.journeys.find(journey => journey.person === "Founder");
  const schoolJourney = school ? plan.journeys.find(journey => journey.person === "Child" || journey.person === "Children") : undefined;
  const schoolDropoff = !!school && founderJourney?.description.includes("school drop-off");
  const homeJourney = founderJourney
    ? `~${founderJourney.minutes} min one way · ${founderJourney.mode.replace(" · illustrative estimate", "")}${schoolDropoff ? " · via school" : ""}`
    : p.business.workspace === "remote" ? "Home and work together · no office journey" : "Work journey to confirm";
  const ages = activeChildAges(p);
  const careNeeded = ages.some(age => age !== null && (age < 5 || age > 18));
  const schoolTravel = schoolJourney ? `~${schoolJourney.minutes} min from home · school bus`
    : schoolDropoff ? `School drop-off in the ${founderJourney!.minutes}-min work journey`
      : "School travel to confirm";
  const schoolDetail = school
    ? `${distanceFromHome(locations[school.id])} · ${childCount} ${childCount === 1 ? "child" : "children · shared-school estimate"} · ${schoolTravel}${ages.includes(null) ? " · Ages to confirm" : ""}${careNeeded ? " · Care quote also needed" : ""}`
    : careNeeded ? "Care or further education · quotes needed" : hasChild(p) ? "School and ages to confirm" : "No school needed for this move";
  const spokes: Spoke[] = [
    { id: "parks", label: "Time outdoors", place: park?.name.replace(/^Demo /, "") ?? "Outdoor place to confirm", detail: proximity(park), connection: "outdoors", position: "top" },
    { id: "market", label: "Shopping", place: market?.name.replace(/^Demo /, "") ?? "Supermarket to confirm", detail: proximity(market), connection: "shopping", position: "left" },
    { id: "home", label: "Your home", place: home?.name ?? "Home to confirm", detail: homeJourney, connection: "work", position: "bottom", kind: "home", inspectId: home?.id },
    { id: "school", label: school ? "School & care" : "Care & education", place: school?.name ?? (hasChild(p) ? "Care & education" : "Your own rhythm"), detail: schoolDetail, connection: school ? "school" : "care", position: "right", kind: school ? "school" : undefined, inspectId: school?.id },
  ];
  const costs = plan.finance.costs.filter(line => line.account === "household");
  const layers = [{ id: "home", label: "Home" }, { id: "market", label: "Shopping" }, ...(hasChild(p) ? [{ id: "school", label: school ? "School" : "Care" }] : []), { id: "work", label: "Work" }, { id: "parks", label: "Outdoors" }];
  const visibleSpokes = spokes.filter(spoke => !hidden.includes(spoke.id) && (spoke.id !== "school" || hasChild(p)));
  const connectedSpokes = hidden.includes("home") ? [] : visibleSpokes.filter(spoke => spoke.connection !== "work" || !hidden.includes("work"));
  const paths = { top: "M200 310H135V95H200V48", left: "M180 310V272H50V180", right: "M220 310V272H350V180", bottom: "M200 310V180" };
  const mobilePaths = { top: "M90 310V160H100", left: "M100 290H195V160H300", right: "M120 320H300V310", bottom: "M100 290H202V35" };
  const anchorContent = <><span className={styles.spokeLabel}>{workplace ? "WORK" : "YOUR BASE"}</span><strong>{anchorName}</strong><small>{workplace ? workDistance : p.business.workspace === "remote" ? "0 km · work from home" : "Workspace to confirm"}</small></>;
  const anchorLabel = `Work: ${anchorName}. Red work connection from home. ${workDistance}. ${homeJourney}.`;
  return <div className={styles.shell} aria-label={`${anchorName} life diagram and expenses`}>
    <section className={styles.hubPanel} aria-label="Your connected places">
      <div className={styles.layers} role="group" aria-label="Show connected places">{layers.map(layer => <button key={layer.id} type="button" aria-pressed={!hidden.includes(layer.id)} aria-controls={`${id}-places`} onClick={() => setHidden(current => current.includes(layer.id) ? current.filter(item => item !== layer.id) : [...current, layer.id])}>{layer.label}</button>)}</div>
      <div className={styles.legend} aria-label="Connection colors"><span className={styles.workConnection}>Work · red</span>{school && <span className={styles.schoolConnection}>School · green</span>}<span className={styles.shoppingConnection}>Shopping · blue</span></div>
      <div id={`${id}-places`} className={styles.hubCanvas}>
        {[{ name: "desktop", paths }, { name: "mobile", paths: mobilePaths }].map(layout => <svg key={layout.name} className={cn(styles.spokes, layout.name === "mobile" && styles.mobileSpokes)} viewBox="0 0 400 360" preserveAspectRatio="none" aria-hidden="true">{connectedSpokes.map(spoke => <g key={spoke.id} data-connection={spoke.connection} className={styles[`${spoke.connection}Connection`]}><path d={layout.paths[spoke.position]} /><circle className={styles.light} r="3.5"><animateMotion dur="3s" repeatCount="indefinite" path={layout.paths[spoke.position]} /></circle></g>)}</svg>)}
        {!hidden.includes("work") && (workplace && onInspect ? <button type="button" className={cn(styles.node, styles.hub)} aria-label={anchorLabel} onClick={() => onInspect({ kind: "workplace", id: workplace.id })}>{anchorContent}</button> : <div className={cn(styles.node, styles.hub)} aria-label={anchorLabel}>{anchorContent}</div>)}
        {visibleSpokes.map(spoke => {
          const content = <><span className={styles.spokeLabel}>{spoke.label}</span><strong>{spoke.place}</strong><small>{spoke.detail}</small></>;
          const category = spoke.id === "home" ? "Home" : spoke.connection === "shopping" ? "Shopping" : spoke.connection === "school" ? "School" : spoke.connection === "care" ? "Care" : "Outdoors";
          const color = spoke.connection === "work" ? "Red" : spoke.connection === "school" ? "Green" : spoke.connection === "shopping" ? "Blue" : "Neutral";
          const label = `${category}: ${spoke.place}. ${color} ${spoke.connection} connection from home. ${spoke.detail}.`;
          return spoke.kind && spoke.inspectId && onInspect
            ? <button key={spoke.id} type="button" className={cn(styles.node, styles[spoke.position], styles[`${spoke.connection}Connection`])} aria-label={label} onClick={() => onInspect({ kind: spoke.kind!, id: spoke.inspectId! })}>{content}</button>
            : <div key={spoke.id} className={cn(styles.node, styles[spoke.position], styles[`${spoke.connection}Connection`])} aria-label={label}>{content}</div>;
        })}
      </div>
      <p className={styles.hubNote}>{workplace?.id !== "harbor-lab" && homePoint && <>Hub71 city reference: {haversineKm(homePoint, locations["harbor-lab"]).toFixed(1)} km straight-line from home. </>}Illustrative places; all km are straight-line from home. Work/school minutes are prepared journeys. Walk allowances use 20 min/km, with a 5-minute minimum. Confirm routes.</p>
    </section>
    <section className={styles.expenses} aria-label="Monthly household expenses">
      <div className={styles.expensesHead}><span className={styles.spokeLabel}>ROOM FOR YOUR EVERYDAY</span><h3>A month in your new life.</h3><p>Average household spending</p></div>
      <ul className={styles.expenseList}>{costs.map(line => <li key={line.label}><span>{line.label}</span><strong>{aed(line.monthly)}</strong></li>)}</ul>
      <div className={styles.expenseTotal}><span>Total</span><strong>{aed(plan.finance.monthlyHousehold)}<small>/mo</small></strong></div>
      <p className={styles.costNote}>{aed(plan.finance.arrivalCash)} in arrival payments{plan.finance.partial ? " · Additional quotes needed" : ""}. Workspace and company costs are separate in Money.</p>
    </section>
  </div>;
}
