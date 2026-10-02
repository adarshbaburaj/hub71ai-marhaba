import { z } from "zod";
import { areas, workplaces } from "@/lib/data";
import { aed, dateLabel } from "@/lib/utils";
import type { GuideProposal, MoveProfile, ProfileEdit } from "@/lib/types";

const amount = z.number().int().min(0).max(100_000_000_000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid date.");
const workplaceId = z.string().max(100).nullable().refine(
  (value) => value === null || workplaces.some((workplace) => workplace.id === value),
  "Choose a workplace from the example directory.",
);

/** Shared browser/server validation. Money is always integer fils. */
export const profileSchema: z.ZodType<MoveProfile> = z.object({
  intent: z.enum(["move", "start", "explore"]).nullable(),
  business: z.object({
    sector: z.string().max(200),
    description: z.string().max(2000),
    workspace: z.enum(["desk", "private", "specialist", "remote", "undecided"]),
    specialistNeeds: z.string().max(1000),
    teamSize: z.number().int().min(1).max(1000),
    workplaceId,
    includeFinances: z.boolean(),
    cash: amount.nullable(),
    monthlyReceipts: amount.nullable(),
    monthlySpending: amount.nullable(),
    founderPay: amount,
  }).strict(),
  household: z.object({
    composition: z.enum(["solo", "partner", "family"]).nullable(),
    partner: z.object({
      work: z.enum(["office", "remote", "hybrid", "seeking", "undecided"]),
      workplaceId,
      days: z.number().int().min(0).max(7),
    }).strict(),
    children: z.number().int().min(0).max(20),
    child: z.object({
      age: z.number().int().min(0).max(21).nullable(),
      curriculum: z.enum(["British", "American", "IB", "Any"]).nullable(),
      swimming: z.boolean(),
      schoolBusEssential: z.boolean(),
    }).strict(),
  }).strict(),
  lifestyle: z.object({
    hobbies: z.array(z.string().trim().min(1).max(100)).max(12).refine((values) => new Set(values).size === values.length, "Choose each hobby once."),
    routine: z.string().max(2000),
  }).strict(),
  home: z.object({
    bedrooms: z.number().int().min(1).max(10),
    furnishing: z.enum(["any", "furnished", "unfurnished"]),
    areas: z.array(z.string().max(100)).max(20).refine(
      (values) => new Set(values).size === values.length && values.every((id) => areas.some((area) => area.id === id)),
      "Choose unique areas from the example directory.",
    ),
    annualRentLimit: amount.nullable(),
  }).strict(),
  transport: z.object({
    car: z.enum(["rental", "none", "undecided"]),
    maxCommute: z.number().int().min(1).max(240).nullable(),
  }).strict(),
  money: z.object({
    monthlyBudget: amount.nullable(),
    cash: amount.nullable(),
    monthlyIncome: amount.nullable(),
    reserve: amount,
    moveDate: date.nullable(),
    referenceDate: date,
    priorities: z.array(z.enum(["cash", "travel", "family"])).max(3).refine(
      (values) => new Set(values).size === values.length,
      "Choose each priority once.",
    ),
  }).strict(),
}).strict();

export const SUPPORTED_EDIT_PATHS = [
  "intent", "business.sector", "business.description", "business.workspace",
  "business.specialistNeeds", "business.teamSize", "business.workplaceId",
  "business.includeFinances", "business.cash", "business.monthlyReceipts",
  "business.monthlySpending", "business.founderPay", "household.composition",
  "household.partner.work", "household.partner.workplaceId", "household.partner.days",
  "household.children", "household.child.age", "household.child.curriculum",
  "household.child.swimming", "household.child.schoolBusEssential", "home.bedrooms",
  "lifestyle.hobbies", "lifestyle.routine",
  "home.furnishing", "home.areas", "home.annualRentLimit", "transport.car",
  "transport.maxCommute", "money.monthlyBudget", "money.cash", "money.monthlyIncome",
  "money.reserve", "money.moveDate", "money.priorities",
] as const;

const allowedPaths = new Set<string>(SUPPORTED_EDIT_PATHS);
const editValue = z.union([z.string().max(2000), z.number().finite(), z.boolean(), z.null(), z.array(z.string().max(100)).max(20)]);
export const profileEditSchema = z.object({ path: z.enum(SUPPORTED_EDIT_PATHS), value: editValue }).strict();
export const guideProposalSchema = z.object({
  explanation: z.string().min(1).max(6000),
  edits: z.array(profileEditSchema).max(12),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
}).strict();

/** The model serializes values so every Responses schema field has one simple type. */
export const guideOutputSchema = z.object({
  explanation: z.string().min(1).max(6000),
  edits: z.array(z.object({
    path: z.enum(SUPPORTED_EDIT_PATHS),
    serializedValue: z.string().max(2200),
  }).strict()).max(12),
}).strict();

/** Applies one atomic, validated patch to a clone; never changes directory data. */
export function applyProfileEdits(profile: MoveProfile, edits: ProfileEdit[]): MoveProfile {
  const next = structuredClone(profileSchema.parse(profile));
  const checked = z.array(profileEditSchema).max(12).parse(edits);
  const seen = new Set<string>();
  for (const edit of checked) {
    if (!allowedPaths.has(edit.path) || seen.has(edit.path)) throw new Error("Unsupported or repeated change.");
    seen.add(edit.path);
    const keys = edit.path.split(".");
    let target = next as unknown as Record<string, unknown>;
    for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
    target[keys[keys.length - 1]] = structuredClone(edit.value);
  }
  return profileSchema.parse(next);
}

export function parseGuideOutput(output: unknown, profile: MoveProfile, revision: number): GuideProposal {
  const parsed = guideOutputSchema.parse(output);
  const edits = parsed.edits.map(({ path, serializedValue }) => ({ path, value: JSON.parse(serializedValue) as ProfileEdit["value"] }));
  applyProfileEdits(profile, edits);
  return guideProposalSchema.parse({ explanation: parsed.explanation, edits, revision });
}

export function isProposalCurrent(proposalRevision: number, currentRevision: number): boolean {
  return Number.isSafeInteger(proposalRevision) && proposalRevision >= 0 && proposalRevision === currentRevision;
}

export const GUIDE_FALLBACK = "Nori is temporarily unavailable. You can keep shaping your Marhaba plan with the answer cards. Your choices and the planning calculations still work.";

export const GUIDE_EDIT_LABELS: Record<(typeof SUPPORTED_EDIT_PATHS)[number], string> = {
  intent: "What brings you here", "business.sector": "Business sector", "business.description": "Business description",
  "business.workspace": "Workspace", "business.specialistNeeds": "Specialist workspace needs", "business.teamSize": "Team size",
  "business.workplaceId": "Business workplace", "business.includeFinances": "Business finances", "business.cash": "Business cash",
  "business.monthlyReceipts": "Monthly business receipts", "business.monthlySpending": "Monthly business spending", "business.founderPay": "Monthly founder pay",
  "household.composition": "Household", "household.partner.work": "Partner's work", "household.partner.workplaceId": "Partner's workplace",
  "household.partner.days": "Partner's office days each week", "household.children": "Children", "household.child.age": "Child's age",
  "household.child.curriculum": "School curriculum", "household.child.swimming": "Swimming", "household.child.schoolBusEssential": "School bus is essential",
  "lifestyle.hobbies": "Hobbies and interests", "lifestyle.routine": "Your daily routine",
  "home.bedrooms": "Bedrooms", "home.furnishing": "Furnishing", "home.areas": "Preferred areas", "home.annualRentLimit": "Annual rent limit",
  "transport.car": "Car", "transport.maxCommute": "Maximum one-way commute", "money.monthlyBudget": "Monthly household budget",
  "money.cash": "Household cash", "money.monthlyIncome": "Monthly household income", "money.reserve": "Cash reserve",
  "money.moveDate": "Moving date", "money.priorities": "Priorities",
};

const moneyPaths = new Set([
  "business.cash", "business.monthlyReceipts", "business.monthlySpending", "business.founderPay",
  "home.annualRentLimit", "money.monthlyBudget", "money.cash", "money.monthlyIncome", "money.reserve",
]);
const valueLabels: Record<string, string> = {
  move: "Move to Abu Dhabi", start: "Start a business", explore: "Explore my options", solo: "Just me", partner: "Me and my partner",
  desk: "Shared desk", private: "Private office", specialist: "Specialist space", remote: "Remote", undecided: "Not decided yet",
  office: "Office", hybrid: "Hybrid", seeking: "Looking for work", any: "Any furnishing", furnished: "Furnished", unfurnished: "Unfurnished",
  rental: "Rental car", none: "No car", cash: "Cash confidence", travel: "Less travel", family: "Family fit",
};

export function readProfileValue(profile: MoveProfile, path: string): unknown {
  if (!allowedPaths.has(path)) throw new Error("Unsupported change.");
  return path.split(".").reduce<unknown>((target, key) => (target as Record<string, unknown>)[key], profile);
}

function formatEditValue(path: string, value: unknown): string {
  if (value === null) return "Not answered yet";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (!value.length) return path === "home.areas" ? "Any area" : "No preference";
    return value.map((entry) => path === "home.areas" ? areas.find((area) => area.id === entry)?.name ?? entry : valueLabels[entry] ?? entry).join(", ");
  }
  if (typeof value === "number" && moneyPaths.has(path)) return aed(value);
  if (path.endsWith("workplaceId")) return workplaces.find((place) => place.id === value)?.name ?? String(value);
  if (path === "money.moveDate" && typeof value === "string") return dateLabel(value);
  if (path === "transport.maxCommute") return `${value} minutes`;
  if (path === "household.child.age") return `${value} years`;
  if (path === "household.composition" && value === "family") return "My family";
  if (typeof value === "string") return value === "" ? "Not answered yet" : valueLabels[value] ?? value;
  return String(value);
}

export function describeProfileEdit(profile: MoveProfile, edit: ProfileEdit): { label: string; before: string; after: string; consequence: string } {
  profileEditSchema.parse(edit);
  const group = edit.path.split(".")[0];
  const consequences: Record<string, string> = {
    intent: "The questions and planning branches will adjust to this choice.",
    business: "Workspace choices, business costs and related journeys will be recalculated.",
    household: "Home, school, activity and household travel choices will be recalculated.",
    lifestyle: "Nearby leisure suggestions will update to reflect your interests. Their availability and costs still need confirmation.",
    home: "Matching homes, arrival payments and related journeys will be recalculated.",
    transport: "Travel options, weekly journey time and transport costs will be recalculated.",
    money: "Plan affordability, arrival payments and cash projections will be recalculated.",
  };
  return {
    label: GUIDE_EDIT_LABELS[edit.path as keyof typeof GUIDE_EDIT_LABELS],
    before: formatEditValue(edit.path, readProfileValue(profile, edit.path)),
    after: formatEditValue(edit.path, edit.value),
    consequence: consequences[group],
  };
}
