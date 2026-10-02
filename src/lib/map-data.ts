import { activities, homes, schools, workplaces } from "@/lib/data";
import { effectiveProfile, hasChild, hasPartner } from "@/lib/profile";
import type { MoveProfile, Plan } from "@/lib/types";

export type MapCategory = "home" | "office" | "school" | "healthcare" | "groceries" | "transit" | "leisure";
export type InspectKind = "home" | "school" | "workplace" | "activity";
export interface Coordinates { lat: number; lng: number }
export interface MapPoint extends Coordinates {
  id: string;
  name: string;
  category: MapCategory;
  areaId: string;
  description: string;
  source: "Demo location" | "Documented address · approximate pin";
  sourceUrl?: string;
  inspectKind?: InspectKind;
  inspectId?: string;
  hobbies?: string[];
  role?: string;
}

export const HUB71_SOURCE = "https://www.hub71.com/contact";
// The official source establishes Hub71's address; this is an approximate map anchor.
export const HUB71_COORDINATES: Coordinates = { lat: 24.4985, lng: 54.3898 };

export const MAP_CATEGORIES: { id: MapCategory; label: string; color: string; symbol: string }[] = [
  { id: "home", label: "Home", color: "#34495e", symbol: "H" },
  { id: "office", label: "Work", color: "#3674d9", symbol: "W" },
  { id: "school", label: "School", color: "#c98b19", symbol: "S" },
  { id: "healthcare", label: "Healthcare", color: "#cf5c79", symbol: "+" },
  { id: "groceries", label: "Groceries", color: "#3b9268", symbol: "G" },
  { id: "transit", label: "Public bus", color: "#8467c4", symbol: "B" },
  { id: "leisure", label: "Hobbies", color: "#28938f", symbol: "L" },
];

const coordinates: Record<string, Coordinates> = {
  "reed-apartment": { lat: 24.4933, lng: 54.4097 },
  "reed-family": { lat: 24.4942, lng: 54.4120 },
  "garden-flat": { lat: 24.4149, lng: 54.5638 },
  "garden-house": { lat: 24.4183, lng: 54.5681 },
  "tide-apartment": { lat: 24.4491, lng: 54.6050 },
  "tide-family": { lat: 24.4509, lng: 54.6033 },
  "quay-flat": { lat: 24.5020, lng: 54.3906 },
  "quay-family": { lat: 24.5003, lng: 54.3914 },
  "reed-school": { lat: 24.4992, lng: 54.4110 },
  "garden-school": { lat: 24.4201, lng: 54.5652 },
  "tide-school": { lat: 24.4442, lng: 54.6009 },
  "quay-school": { lat: 24.5030, lng: 54.3882 },
  "horizon-school": { lat: 24.4920, lng: 54.4140 },
  "orchard-school": { lat: 24.4220, lng: 54.5742 },
  "harbor-lab": HUB71_COORDINATES,
  "central-studio": { lat: 24.4916, lng: 54.4059 },
  "orchard-works": { lat: 24.4191, lng: 54.5710 },
  "garden-swim": { lat: 24.4186, lng: 54.5702 },
  "reed-swim": { lat: 24.4966, lng: 54.4128 },
  "tide-swim": { lat: 24.4480, lng: 54.6025 },
};

/** Static demo pins never establish property availability or actual venue locations. */
export const locations: Record<string, MapPoint> = Object.fromEntries([
  ...homes.map((home): MapPoint => ({ ...coordinates[home.id], id: home.id, name: home.name, areaId: home.areaId, category: "home", description: "Illustrative home pin. Rent, furnishing and availability are demo assumptions.", source: "Demo location", inspectKind: "home", inspectId: home.id })),
  ...schools.map((school): MapPoint => ({ ...coordinates[school.id], id: school.id, name: school.name, areaId: school.areaId, category: "school", description: "Illustrative school pin. Confirm admission, stage, fees and exact school-bus coverage separately.", source: "Demo location", inspectKind: "school", inspectId: school.id })),
  ...workplaces.map((place): MapPoint => ({ ...coordinates[place.id], id: place.id, name: place.id === "harbor-lab" ? "Hub71" : place.name, areaId: place.areaId, category: "office", description: place.id === "harbor-lab" ? "Al Khatem Tower, ADGM Square, Al Maryah Island. Address documented by Hub71; map pin approximate. Planner fees and workspace suitability remain demo assumptions." : "Illustrative workplace pin. Confirm actual workspace suitability and terms.", source: place.id === "harbor-lab" ? "Documented address · approximate pin" : "Demo location", sourceUrl: place.id === "harbor-lab" ? HUB71_SOURCE : undefined, inspectKind: "workplace", inspectId: place.id })),
  ...activities.map((activity): MapPoint => ({ ...coordinates[activity.id], id: activity.id, name: activity.name, areaId: activity.areaId, category: "leisure", description: "Illustrative swimming venue. Confirm lessons, schedules and fees.", source: "Demo location", inspectKind: "activity", inspectId: activity.id, hobbies: ["Swimming"] })),
].map((point) => [point.id, point]));

const areaCenters = [
  { id: "reem", label: "Reem", lat: 24.4938, lng: 54.4110 },
  { id: "maryah", label: "Maryah", lat: 24.4991, lng: 54.3898 },
  { id: "khalifa", label: "Khalifa", lat: 24.4181, lng: 54.5684 },
  { id: "raha", label: "Raha", lat: 24.4485, lng: 54.6031 },
];

/** Nearby services are explicitly fictional, including hospitals and bus stops. */
export const nearbyPoints: MapPoint[] = areaCenters.flatMap((area) => [
  { key: "hospital", title: "Hospital", category: "healthcare" as const, dx: 0.0031, dy: -0.0032, description: "Demo healthcare pin. This is not a real hospital or verified coverage; confirm an actual provider and insurance network." },
  { key: "market", title: "Supermarket", category: "groceries" as const, dx: -0.0020, dy: 0.0025, description: "Demo grocery pin, used to illustrate nearby daily essentials. Verify actual stores and opening hours." },
  { key: "bus", title: "Public Bus Stop", category: "transit" as const, dx: 0.0009, dy: 0.0008, description: "Demo public-bus pin. Check actual stops and services. This does not establish school-bus coverage." },
  { key: "park", title: "Running & Cycling Park", category: "leisure" as const, dx: 0.0022, dy: 0.0045, description: "Demo outdoor recreation pin. Check actual routes, access and facilities.", hobbies: ["Running", "Cycling", "Walking", "Outdoors"] },
  { key: "coffee", title: "Coffee & Reading Corner", category: "leisure" as const, dx: -0.0013, dy: -0.0019, description: "Demo café and reading pin. Availability, facilities and costs are unverified.", hobbies: ["Coffee", "Reading", "Food", "Cooking"] },
  { key: "fitness", title: "Fitness & Yoga Studio", category: "leisure" as const, dx: -0.0034, dy: 0.0005, description: "Demo fitness venue. Confirm actual sessions, memberships and fees.", hobbies: ["Gym", "Fitness", "Yoga"] },
  { key: "courts", title: "Tennis & Padel Courts", category: "leisure" as const, dx: 0.0039, dy: 0.0021, description: "Demo racquet-sport venue. Confirm actual courts, booking and fees.", hobbies: ["Tennis", "Padel"] },
  { key: "pool", title: "Swimming Pool", category: "leisure" as const, dx: -0.0028, dy: -0.0033, description: "Demo swimming pin. Confirm lessons, safe access, schedules and fees.", hobbies: ["Swimming", "Beach"] },
  { key: "arts", title: "Arts & Community Studio", category: "leisure" as const, dx: 0.0017, dy: -0.0040, description: "Demo community venue. Confirm actual classes, events and fees.", hobbies: ["Arts", "Art", "Music", "Photography"] },
].map((entry): MapPoint => ({ id: `demo-${area.id}-${entry.key}`, name: `Demo ${area.label} ${entry.title}`, category: entry.category, areaId: area.id, lat: area.lat + entry.dx, lng: area.lng + entry.dy, description: entry.description, source: "Demo location", hobbies: entry.hobbies })));

/** Spherical great-circle distance, never a driving route or travel-time estimate. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = rad(b.lat - a.lat);
  const deltaLng = rad(b.lng - a.lng);
  const chord = Math.sin(deltaLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(Math.min(1, chord)), Math.sqrt(Math.max(0, 1 - chord)));
}

export function buildMapPoints(input: MoveProfile, plan: Plan | null): { origin: MapPoint; points: MapPoint[]; originLabel: string } {
  const profile = effectiveProfile(input);
  const founderId = profile.business.workspace === "remote" ? null : plan?.workplaceId ?? profile.business.workplaceId;
  const origin = plan && locations[plan.homeId] ? { ...locations[plan.homeId], role: "Your plan's home" } : { ...(locations[founderId ?? "harbor-lab"] ?? locations["harbor-lab"]), role: founderId ? "Your founder workplace" : "Hub71 · reference anchor" };
  const points: MapPoint[] = [origin];
  if (founderId && locations[founderId]) points.push({ ...locations[founderId], role: "Founder workplace" });
  if (hasPartner(profile) && ["office", "hybrid"].includes(profile.household.partner.work)) {
    const id = profile.household.partner.workplaceId;
    if (id && locations[id]) points.push({ ...locations[id], role: "Partner workplace" });
  }
  if (hasChild(profile)) {
    if (plan?.schoolId && locations[plan.schoolId]) points.push({ ...locations[plan.schoolId], role: "Your plan's school" });
    else schools.filter((school) => (profile.household.child.curriculum === null || profile.household.child.curriculum === "Any" || school.curriculum === profile.household.child.curriculum) && (profile.household.child.age === null || (school.minAge <= profile.household.child.age && school.maxAge >= profile.household.child.age))).forEach((school) => points.push({ ...locations[school.id], role: "School candidate · confirm suitability" }));
  }
  if (plan?.activityId && locations[plan.activityId]) points.push({ ...locations[plan.activityId], role: "Your plan's swimming activity" });

  const interests = profile.lifestyle.hobbies.map((hobby) => hobby.toLowerCase());
  if (hasChild(profile) && profile.household.child.swimming) interests.push("swimming");
  for (const category of ["healthcare", "groceries", "transit"] as const) {
    points.push(...nearbyPoints.filter((point) => point.category === category).sort((a, b) => haversineKm(origin, a) - haversineKm(origin, b)).slice(0, 1));
  }
  const leisure = nearbyPoints.filter((point) => point.areaId === origin.areaId && point.category === "leisure" && (!interests.length || point.hobbies?.some((tag) => interests.some((interest) => interest.includes(tag.toLowerCase()) || tag.toLowerCase().includes(interest))))).sort((a, b) => haversineKm(origin, a) - haversineKm(origin, b));
  points.push(...leisure.slice(0, interests.length ? 5 : 3));
  const unique = new Map<string, MapPoint>();
  for (const point of points) {
    const existing = unique.get(point.id);
    unique.set(point.id, existing && existing.role !== point.role ? { ...point, role: `${existing.role}; ${point.role}` } : point);
  }
  return { origin, points: [...unique.values()], originLabel: origin.category === "home" ? "From your plan's home" : "From the workplace reference" };
}
