import { areas, workplaces } from "@/lib/data";
import { hasChild, hasPartner } from "@/lib/profile";
import type { MoveProfile, NodeId } from "@/lib/types";
import { aed } from "@/lib/utils";

export interface MoveNode {
  id: NodeId;
  parent?: NodeId;
  label: string;
  summary: string;
  status: "answered" | "undecided";
  branch: number;
}

export const nodeLabels: Record<NodeId, string> = {
  business: "Business",
  workspace: "A place to work",
  "business-money": "Business finances",
  household: "Household",
  partner: "Your partner’s work",
  child: "School & activities",
  lifestyle: "Your everyday",
  home: "Home",
  transport: "Transport",
  money: "Money & priorities",
  priorities: "What matters most",
};

export function nodeOrder(profile: MoveProfile): NodeId[] {
  return [
    "business", "workspace",
    ...(profile.business.includeFinances ? ["business-money" as const] : []),
    "household",
    ...(hasPartner(profile) ? ["partner" as const] : []),
    ...(hasChild(profile) ? ["child" as const] : []),
    "lifestyle", "home", "transport", "money", "priorities",
  ];
}

const locationName = (id: string | null) => workplaces.find((item) => item.id === id)?.name;
const compactMoney = (value: number | null) => value === null ? "Undecided" : aed(value);

export function deriveNodes(profile: MoveProfile, visited: NodeId[]): MoveNode[] {
  const order = nodeOrder(profile);
  const seen = new Set(visited);
  let revealThrough = Math.max(0, ...visited.map((id) => order.indexOf(id) + 1));
  if (profile.household.composition !== null) revealThrough = Math.max(revealThrough, order.indexOf("household") + 1);
  const workspaceSummary = profile.business.workspace === "undecided" ? "Workspace undecided" : ({ desk: "Flexible workspace", private: "Private office", specialist: "Specialist space", remote: "Mostly remote" } as const)[profile.business.workspace];
  const summaries: Record<NodeId, string> = {
    business: profile.intent === "move" ? `${profile.business.sector || "Existing business"} · ${profile.business.teamSize} ${profile.business.teamSize === 1 ? "person" : "people"}` : profile.intent === "start" ? `${profile.business.sector || "A new business"} · starting here` : profile.intent === "explore" ? "Exploring the possibilities" : "Where would you like to begin?",
    workspace: `${workspaceSummary}${locationName(profile.business.workplaceId) ? ` · ${locationName(profile.business.workplaceId)}` : ""}`,
    "business-money": profile.business.cash === null ? "Optional cash assumptions" : `${aed(profile.business.cash)} available cash`,
    household: profile.household.composition === "solo" ? "Moving on your own" : profile.household.composition === "partner" ? "Two adults" : profile.household.composition === "family" ? "Two adults and one child" : "Your household, your way",
    partner: profile.household.partner.work === "remote" ? "Working remotely" : profile.household.partner.work === "seeking" ? "Looking for work" : profile.household.partner.work === "undecided" ? "Work situation undecided" : `${profile.household.partner.days} workplace days${locationName(profile.household.partner.workplaceId) ? ` · ${locationName(profile.household.partner.workplaceId)}` : " · location undecided"}`,
    child: `${profile.household.child.curriculum || "Curriculum undecided"}${profile.household.child.age === null ? "" : ` · age ${profile.household.child.age}`}${profile.household.child.swimming ? " · swimming" : ""}`,
    lifestyle: profile.lifestyle.hobbies.length ? `${profile.lifestyle.hobbies.slice(0, 2).join(" · ")}${profile.lifestyle.hobbies.length > 2 ? ` +${profile.lifestyle.hobbies.length - 2}` : ""}` : profile.lifestyle.routine.trim() ? "Your daily routine" : "Room for the things you enjoy",
    home: `${profile.home.bedrooms} bedrooms${profile.home.annualRentLimit === null ? " · rent undecided" : ` · up to ${aed(profile.home.annualRentLimit)}/year`}${profile.home.areas.length === 1 ? ` · ${areas.find((area) => area.id === profile.home.areas[0])?.name || profile.home.areas[0]}` : ""}`,
    transport: profile.transport.car === "none" ? "No car · supported journeys" : profile.transport.car === "rental" ? "One rental car" : "Car access undecided",
    money: profile.money.monthlyBudget === null ? "Spending range undecided" : `${compactMoney(profile.money.monthlyBudget)}/month`,
    priorities: profile.money.priorities.length ? profile.money.priorities.map((item) => ({ cash: "Preserve cash", travel: "Shorter journeys", family: "Family fit" })[item]).join(" · ") : "Your priorities are open",
  };
  const answered: Record<NodeId, boolean> = {
    business: profile.intent !== null,
    workspace: profile.business.workspace !== "undecided",
    "business-money": [profile.business.cash, profile.business.monthlyReceipts, profile.business.monthlySpending].some((value) => value !== null),
    household: profile.household.composition !== null,
    partner: profile.household.partner.work !== "undecided",
    child: profile.household.child.curriculum !== null || profile.household.child.age !== null,
    lifestyle: profile.lifestyle.hobbies.length > 0 || profile.lifestyle.routine.trim().length > 0,
    home: seen.has("home"),
    transport: profile.transport.car !== "undecided",
    money: profile.money.monthlyBudget !== null || profile.money.cash !== null || profile.money.moveDate !== null,
    priorities: profile.money.priorities.length > 0,
  };
  const hierarchy: Record<NodeId, { parent?: NodeId; branch: number }> = {
    business: { branch: 0 }, workspace: { parent: "business", branch: 0 }, "business-money": { parent: "business", branch: 0 },
    household: { branch: 1 }, partner: { parent: "household", branch: 1 }, child: { parent: "household", branch: 1 }, lifestyle: { parent: "household", branch: 1 },
    home: { branch: 2 }, transport: { branch: 3 }, money: { branch: 4 }, priorities: { parent: "money", branch: 4 },
  };
  return order.filter((_, index) => index <= revealThrough).map((id) => ({
    id, label: nodeLabels[id], summary: seen.has(id) || id === "business" && profile.intent !== null || id === "household" && profile.household.composition !== null ? summaries[id] : "Open this branch to shape your move",
    status: answered[id] && (seen.has(id) || id === "business" || id === "household") ? "answered" : "undecided",
    ...hierarchy[id],
  }));
}

export function nextNode(profile: MoveProfile, _visited: NodeId[], id: NodeId): NodeId | null {
  const order = nodeOrder(profile);
  const index = order.indexOf(id);
  return index < 0 ? order[0] : order[index + 1] ?? null;
}
