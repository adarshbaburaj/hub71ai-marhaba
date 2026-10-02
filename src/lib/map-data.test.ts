import { describe, expect, it } from "vitest";
import { activities, homes, schools, workplaces } from "./data";
import { buildMapPoints, haversineKm, HUB71_COORDINATES, HUB71_SOURCE, locations, nearbyPoints } from "./map-data";
import { blankProfile, sampleProfile } from "./profile";
import { generatePlans } from "./planner";

describe("map geography and proximity", () => {
  it("has a valid Abu Dhabi-area coordinate for every planning directory ID", () => {
    for (const item of [...homes, ...schools, ...workplaces, ...activities]) {
      expect(locations[item.id]).toBeDefined();
      expect(locations[item.id].lat).toBeGreaterThan(24.3);
      expect(locations[item.id].lat).toBeLessThan(24.6);
      expect(locations[item.id].lng).toBeGreaterThan(54.3);
      expect(locations[item.id].lng).toBeLessThan(54.7);
      expect(locations[item.id].inspectId).toBe(item.id);
    }
  });

  it("labels the documented Hub71 address with an explicitly approximate pin", () => {
    expect(locations["harbor-lab"]).toMatchObject({ ...HUB71_COORDINATES, name: "Hub71", sourceUrl: HUB71_SOURCE, source: "Documented address · approximate pin" });
    expect(locations["harbor-lab"].description).toContain("planning assumptions");
    expect(nearbyPoints.every((point) => point.source === "Demo location" && point.name.startsWith("Demo "))).toBe(true);
  });

  it("computes haversine distances without confusing kilometres and route minutes", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.195, 3);
    expect(haversineKm(HUB71_COORDINATES, HUB71_COORDINATES)).toBe(0);
    const home = locations["reed-apartment"];
    expect(haversineKm(home, HUB71_COORDINATES)).toBeCloseTo(haversineKm(HUB71_COORDINATES, home), 10);
    expect(haversineKm(home, HUB71_COORDINATES)).toBeGreaterThan(1);
    expect(haversineKm(home, HUB71_COORDINATES)).toBeLessThan(4);
  });

  it("starts at the Hub71 reference without inventing a household or school", () => {
    const result = buildMapPoints(blankProfile(), null);
    expect(result.origin.id).toBe("harbor-lab");
    expect(result.origin.role).toContain("reference");
    expect(result.points.some((point) => point.category === "home" || point.category === "school")).toBe(false);
    expect(result.points.some((point) => point.category === "healthcare")).toBe(true);
    expect(result.points.some((point) => point.category === "groceries")).toBe(true);
    expect(result.points.some((point) => point.category === "transit")).toBe(true);
  });

  it("shows selected home, school and both active workplaces without duplicate pins", () => {
    const profile = sampleProfile();
    const plan = generatePlans(profile).all.find((candidate) => candidate.schoolId !== null)!;
    const result = buildMapPoints(profile, plan);
    expect(result.origin.id).toBe(plan.homeId);
    expect(result.points.some((point) => point.id === plan.schoolId)).toBe(true);
    expect(result.points.some((point) => point.id === "harbor-lab")).toBe(true);
    expect(result.points.some((point) => point.id === "central-studio")).toBe(true);
    expect(new Set(result.points.map((point) => point.id)).size).toBe(result.points.length);
  });

  it("hides inactive school and partner branches while retaining original answers", () => {
    const profile = sampleProfile();
    profile.household.composition = "solo";
    profile.business.workspace = "remote";
    const result = buildMapPoints(profile, null);
    expect(result.points.some((point) => point.category === "school")).toBe(false);
    expect(result.points.some((point) => point.id === "central-studio")).toBe(false);
    expect(profile.household.partner.workplaceId).toBe("central-studio");
    expect(profile.household.child.age).toBe(8);
  });

  it("matches school candidates by age and curriculum before a plan is selected", () => {
    const profile = sampleProfile();
    profile.household.child.curriculum = "IB";
    const candidates = buildMapPoints(profile, null).points.filter((point) => point.category === "school");
    expect(candidates.map((point) => point.id)).toEqual(["orchard-school"]);
    expect(candidates[0].description).toContain("school-bus coverage");
  });

  it("keeps hobby suggestions near the current anchor and states bus coverage separately", () => {
    const profile = blankProfile();
    profile.lifestyle.hobbies = ["Tennis"];
    const points = buildMapPoints(profile, null).points;
    const leisure = points.filter((point) => point.category === "leisure");
    expect(leisure.length).toBe(1);
    expect(leisure[0].hobbies).toContain("Tennis");
    expect(leisure[0].areaId).toBe("maryah");
    expect(points.find((point) => point.category === "transit")?.description).toContain("does not establish school-bus coverage");
  });
});
