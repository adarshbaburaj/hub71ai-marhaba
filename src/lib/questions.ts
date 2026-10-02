import { areas, workplaces } from "@/lib/data";
import { hasChild, hasPartner } from "@/lib/profile";
import type { MoveProfile, NodeId } from "@/lib/types";

export type QuestionAnswer = string | number | boolean | string[] | null;
export interface QuestionOption { value: string | boolean; label: string; detail?: string }
export interface MoveQuestion {
  id: string;
  node: NodeId;
  title: string;
  kind: "choice" | "multiple" | "number" | "text" | "textarea" | "date";
  path: string;
  hint?: string;
  placeholder?: string;
  options?: QuestionOption[];
  optional?: boolean;
  currency?: boolean;
  ordered?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  emptyValue?: QuestionAnswer;
  nearby?: boolean;
  applies?: (profile: MoveProfile) => boolean;
}

const inOffice = (profile: MoveProfile) => hasPartner(profile) && ["office", "hybrid"].includes(profile.household.partner.work);
const workplaceOptions: QuestionOption[] = [
  ...workplaces.map((place) => ({ value: place.id, label: place.name, detail: `${areas.find((area) => area.id === place.areaId)?.name ?? "Abu Dhabi"}${place.id === "harbor-lab" ? " · suggested starting point" : ""}` })),
  { value: "", label: "I haven’t chosen a location" },
];
const companyMoney = (profile: MoveProfile) => profile.business.includeFinances;

/** Each definition addresses one profile field. Conditional questions retain dormant values. */
export const questionDefinitions: MoveQuestion[] = [
  { id: "business-path", node: "business", path: "intent", kind: "choice", title: "What brings your business to Abu Dhabi?", options: [{ value: "move", label: "Scale an existing business" }, { value: "start", label: "Start a new business" }], applies: (p) => p.intent === null || p.intent === "explore" },
  { id: "business-field", node: "business", path: "business.sector", kind: "choice", title: "What kind of business are you building?", hint: "A broad direction is enough for now.", optional: true, options: [{ value: "Software", label: "Software & technology" }, { value: "Consulting", label: "Consulting & professional services" }, { value: "Creative services", label: "Creative work" }, { value: "Commerce", label: "Commerce" }, { value: "Other", label: "Something else" }, { value: "", label: "I’m still exploring" }] },
  { id: "business-description", node: "business", path: "business.description", kind: "textarea", title: "Tell me a little about the idea.", hint: "One sentence is plenty. You can leave this open.", placeholder: "We’re building…", optional: true, maxLength: 2000 },
  { id: "business-team", node: "business", path: "business.teamSize", kind: "number", title: "How many people are moving for the business?", hint: "Include yourself. Your household comes a little later.", min: 1, max: 1000, emptyValue: 1 },
  { id: "workspace-type", node: "workspace", path: "business.workspace", kind: "choice", title: "Where would you do your best work?", options: [{ value: "desk", label: "A flexible desk" }, { value: "private", label: "A private office" }, { value: "specialist", label: "A specialist space", detail: "A laboratory, workshop, shop or another specific setup." }, { value: "remote", label: "Mostly from home" }, { value: "undecided", label: "I’m not sure yet" }] },
  { id: "workspace-specialist", node: "workspace", path: "business.specialistNeeds", kind: "textarea", title: "What would that space need?", hint: "Specialist suitability stays unconfirmed in this demo.", placeholder: "A workshop with…", maxLength: 1000, optional: true, applies: (p) => p.business.workspace === "specialist" },
  { id: "workspace-anchor", node: "workspace", path: "business.workplaceId", kind: "choice", title: "Where should we anchor your working week?", hint: "Hub71 is the suggested startup anchor. Access, space and actual fees need confirmation.", options: workplaceOptions, emptyValue: null, nearby: true, applies: (p) => p.business.workspace !== "remote" },
  { id: "business-finance-toggle", node: "workspace", path: "business.includeFinances", kind: "choice", title: "Would you like to include company finances?", hint: "Company cash stays separate from household money.", options: [{ value: true, label: "Yes, add a simple estimate" }, { value: false, label: "I’ll leave that for later" }] },
  { id: "business-cash", node: "business-money", path: "business.cash", kind: "number", title: "How much company cash is available?", currency: true, optional: true, hint: "Opening cash in the company account, separate from household funds.", applies: companyMoney },
  { id: "business-receipts", node: "business-money", path: "business.monthlyReceipts", kind: "number", title: "What cash will the company receive each month?", currency: true, optional: true, hint: "Use money expected to reach the account, rather than invoices or profit.", applies: companyMoney },
  { id: "business-spending", node: "business-money", path: "business.monthlySpending", kind: "number", title: "What will the company spend each month?", currency: true, optional: true, hint: "Operating spending before workspace costs and founder pay.", applies: companyMoney },
  { id: "business-founder-pay", node: "business-money", path: "business.founderPay", kind: "number", title: "How much will you draw from the company?", currency: true, optional: true, emptyValue: 0, hint: "Monthly founder pay is a transfer into household cash. Enter 0 if you won’t draw pay.", applies: companyMoney },
  { id: "household-composition", node: "household", path: "household.composition", kind: "choice", title: "Who’s making the move with you?", options: [{ value: "solo", label: "Just me" }, { value: "partner", label: "Me and my partner" }, { value: "family", label: "My family, including a child", detail: "This demo models two adults and one child." }] },
  { id: "partner-work", node: "partner", path: "household.partner.work", kind: "choice", title: "What will your partner’s working week look like?", options: [{ value: "office", label: "They have a workplace" }, { value: "remote", label: "They work remotely" }, { value: "hybrid", label: "A mix of office and remote work" }, { value: "seeking", label: "They’ll look for work" }, { value: "undecided", label: "It’s still undecided" }], applies: hasPartner },
  { id: "partner-anchor", node: "partner", path: "household.partner.workplaceId", kind: "choice", title: "Where will your partner work?", hint: "Use an illustrative workplace anchor to connect the week.", options: workplaceOptions, emptyValue: null, nearby: true, applies: inOffice },
  { id: "partner-days", node: "partner", path: "household.partner.days", kind: "number", title: "How many days a week will they go there?", min: 1, max: 7, emptyValue: 1, applies: inOffice },
  { id: "child-age", node: "child", path: "household.child.age", kind: "number", title: "How old is your child?", hint: "School year placement and admission will still need confirmation.", optional: true, min: 0, max: 21, applies: hasChild },
  { id: "child-curriculum", node: "child", path: "household.child.curriculum", kind: "choice", title: "Which school curriculum would you prefer?", options: [{ value: "British", label: "British" }, { value: "American", label: "American" }, { value: "IB", label: "IB" }, { value: "Any", label: "I’m open to options" }], nearby: true, applies: hasChild },
  { id: "child-swimming", node: "child", path: "household.child.swimming", kind: "choice", title: "Should swimming be part of your child’s week?", hint: "We’ll include a school provision or a separate activity, with its cost and journey.", options: [{ value: true, label: "Yes, keep swimming in the plan" }, { value: false, label: "No particular requirement" }], applies: hasChild },
  { id: "child-bus", node: "child", path: "household.child.schoolBusEssential", kind: "choice", title: "Is a school bus essential?", hint: "School transport is checked separately from the public bus network.", options: [{ value: true, label: "Yes, we need school transport" }, { value: false, label: "No, other arrangements could work" }], applies: hasChild },
  { id: "lifestyle-hobbies", node: "lifestyle", path: "lifestyle.hobbies", kind: "multiple", title: "What do you like to make time for?", hint: "Choose any that feel like you. These help you explore nearby places.", optional: true, options: ["Running", "Swimming", "Fitness", "Cycling", "Coffee", "Reading", "Outdoors"].map((hobby) => ({ value: hobby, label: hobby })) },
  { id: "lifestyle-routine", node: "lifestyle", path: "lifestyle.routine", kind: "textarea", title: "What does a good ordinary day look like?", hint: "A habit, a routine, a little thing you’d like to keep.", placeholder: "A morning walk, coffee between meetings…", optional: true, maxLength: 2000 },
  { id: "home-bedrooms", node: "home", path: "home.bedrooms", kind: "number", title: "How many bedrooms would feel right?", min: 1, max: 10, emptyValue: 2 },
  { id: "home-furnishing", node: "home", path: "home.furnishing", kind: "choice", title: "Would you like a furnished home?", options: [{ value: "furnished", label: "Ready to move into" }, { value: "unfurnished", label: "I’ll bring or choose my own furniture" }, { value: "any", label: "Either could work" }] },
  { id: "home-rent", node: "home", path: "home.annualRentLimit", kind: "number", title: "What annual rent would you be comfortable with?", currency: true, optional: true, hint: "Annual rent before deposits and utilities. Leave open to compare without a limit." },
  { id: "home-areas", node: "home", path: "home.areas", kind: "multiple", title: "Are there areas you’d like to consider?", optional: true, hint: "Choose a few, or leave them all open.", nearby: true, options: areas.map((area) => ({ value: area.id, label: area.name, detail: area.description })) },
  { id: "transport-car", node: "transport", path: "transport.car", kind: "choice", title: "Will you have a car?", hint: "This changes the journeys and homes that can work together.", options: [{ value: "rental", label: "Yes, one rental car" }, { value: "none", label: "We won’t have a car" }, { value: "undecided", label: "I haven’t decided" }] },
  { id: "transport-commute", node: "transport", path: "transport.maxCommute", kind: "number", title: "How long would a comfortable commute be?", hint: "Maximum one-way minutes for a workplace journey. Demo travel times are illustrative.", optional: true, min: 1, max: 240 },
  { id: "money-budget", node: "money", path: "money.monthlyBudget", kind: "number", title: "What monthly household spending feels comfortable?", currency: true, optional: true, hint: "A limit for the included categories. Unknown quotes remain outside a partial total." },
  { id: "money-cash", node: "money", path: "money.cash", kind: "number", title: "How much household cash will you arrive with?", currency: true, optional: true, hint: "You can compare costs without sharing cash. Add this for a balance projection." },
  { id: "money-income", node: "money", path: "money.monthlyIncome", kind: "number", title: "What other income will reach your household each month?", currency: true, optional: true, hint: "Exclude founder pay already entered under company finances." },
  { id: "money-reserve", node: "money", path: "money.reserve", kind: "number", title: "How much cash would you like to keep protected?", currency: true, optional: true, emptyValue: 0, hint: "Your minimum reserve. Enter 0 if you haven’t chosen one." },
  { id: "money-arrival", node: "money", path: "money.moveDate", kind: "date", title: "When would you like to arrive?", optional: true, hint: "Leave this open if the timing is still taking shape." },
  { id: "money-reference", node: "money", path: "money.referenceDate", kind: "date", title: "Which date should we use for planning?", hint: "An editable calculation reference while your arrival is undecided.", applies: (p) => !p.money.moveDate },
  { id: "priorities-order", node: "priorities", path: "money.priorities", kind: "multiple", title: "What would you like this move to protect?", hint: "Choose in order of importance. Click a selected priority to remove it, then add it back in a new position.", optional: true, ordered: true, options: [{ value: "cash", label: "Preserve cash", detail: "Keep the initial commitment and recurring spending manageable." }, { value: "travel", label: "Shorter journeys", detail: "Spend less of the week travelling." }, { value: "family", label: "Family fit", detail: "Make room for school, activities and a comfortable home." }] },
];

export function questionsForProfile(profile: MoveProfile): MoveQuestion[] {
  return questionDefinitions.filter((question) => !question.applies || question.applies(profile));
}

export function questionsForNode(profile: MoveProfile, node: NodeId): MoveQuestion[] {
  return questionsForProfile(profile).filter((question) => question.node === node);
}

export function adjacentQuestion(profile: MoveProfile, id: string, direction: -1 | 1): MoveQuestion | null {
  const currentIndex = questionDefinitions.findIndex((question) => question.id === id);
  const candidates = questionsForProfile(profile).filter((question) => {
    const index = questionDefinitions.indexOf(question);
    return direction === 1 ? index > currentIndex : index < currentIndex;
  });
  return (direction === 1 ? candidates[0] : candidates.at(-1)) ?? null;
}

export function readQuestionAnswer(profile: MoveProfile, question: MoveQuestion): QuestionAnswer {
  let value: unknown = profile;
  for (const key of question.path.split(".")) value = (value as Record<string, unknown>)[key];
  return value as QuestionAnswer;
}

export function applyQuestionAnswer(profile: MoveProfile, question: MoveQuestion, answer: QuestionAnswer): MoveProfile {
  const next = structuredClone(profile);
  const keys = question.path.split(".");
  let target = next as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[keys.at(-1)!] = (answer === "" || answer === null) && "emptyValue" in question ? question.emptyValue : answer;
  if (question.path === "household.composition" && answer === "family") next.household.children = Math.max(1, next.household.children);
  return next;
}
