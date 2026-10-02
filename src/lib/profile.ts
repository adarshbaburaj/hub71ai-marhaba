import type { MoveProfile } from "./types";

function dubaiDate(): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string): string => parts.find(part => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function sampleMoveDate(): string {
  const date = new Date(`${dubaiDate()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 90);
  return date.toISOString().slice(0, 10);
}

/** Start without inventing household income, cash, workplaces or education needs. */
export function blankProfile(): MoveProfile {
  return {
    intent: null,
    business: { sector: "", description: "", workspace: "undecided", specialistNeeds: "", teamSize: 1, workplaceId: null, includeFinances: false, cash: null, monthlyReceipts: null, monthlySpending: null, founderPay: 0 },
    household: { composition: null, partner: { work: "undecided", workplaceId: null, days: 5 }, children: 0, child: { age: null, curriculum: null, swimming: false, schoolBusEssential: false } },
    lifestyle: { hobbies: [], routine: "" },
    home: { bedrooms: 2, furnishing: "any", areas: [], annualRentLimit: null },
    transport: { car: "undecided", maxCommute: null },
    money: { monthlyBudget: null, cash: null, monthlyIncome: null, reserve: 0, moveDate: null, referenceDate: dubaiDate(), priorities: [] },
  };
}

export function sampleProfile(): MoveProfile {
  const p = blankProfile();
  p.intent = "move";
  p.business = { ...p.business, sector: "Software", description: "An early-stage software company", workspace: "desk", workplaceId: "harbor-lab" };
  p.household = { composition: "family", partner: { work: "office", workplaceId: "central-studio", days: 5 }, children: 1, child: { age: 8, curriculum: "British", swimming: true, schoolBusEssential: false } };
  p.lifestyle = { hobbies: ["Running", "Coffee", "Swimming"], routine: "Early starts, a morning run, and coffee between meetings." };
  p.home.annualRentLimit = 11_000_000;
  p.transport = { car: "rental", maxCommute: 45 };
  const date = sampleMoveDate();
  p.money = { monthlyBudget: 2_000_000, cash: 10_000_000, monthlyIncome: 1_500_000, reserve: 1_000_000, moveDate: date, referenceDate: date, priorities: ["cash", "travel", "family"] };
  return p;
}

export const hasPartner = (p: MoveProfile): boolean => p.household.composition === "partner" || p.household.composition === "family";
export const hasChild = (p: MoveProfile): boolean => p.household.composition === "family" && p.household.children > 0;

/** Derive an active profile without destroying answers needed when branches reopen. */
export function effectiveProfile(p: MoveProfile): MoveProfile {
  const active = structuredClone(p);
  // Older locally saved profiles remain usable after adding lifestyle questions.
  active.lifestyle ??= { hobbies: [], routine: "" };
  if (!hasPartner(active)) active.household.partner = { work: "undecided", workplaceId: null, days: 0 };
  if (!hasChild(active)) {
    active.household.children = 0;
    active.household.child = { age: null, curriculum: null, swimming: false, schoolBusEssential: false };
  }
  if (!["office", "hybrid"].includes(active.household.partner.work)) {
    active.household.partner.workplaceId = null;
    active.household.partner.days = 0;
  }
  if (active.business.workspace === "remote") active.business.workplaceId = null;
  if (!active.business.includeFinances) {
    active.business.cash = null;
    active.business.monthlyReceipts = null;
    active.business.monthlySpending = null;
    active.business.founderPay = 0;
  }
  return active;
}
