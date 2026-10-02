export type Intent = "move" | "start" | "explore";
export type Priority = "cash" | "travel" | "family";
export type NodeId = "business" | "workspace" | "business-money" | "household" | "partner" | "child" | "lifestyle" | "home" | "transport" | "money" | "priorities";
/** All money amounts are integer fils (100 fils = 1 AED). */
export interface MoveProfile {
  intent: Intent | null;
  business: { sector: string; description: string; workspace: "desk" | "private" | "specialist" | "remote" | "undecided"; specialistNeeds: string; teamSize: number; workplaceId: string | null; includeFinances: boolean; cash: number | null; monthlyReceipts: number | null; monthlySpending: number | null; founderPay: number };
  household: { composition: "solo" | "partner" | "family" | null; partner: { work: "office" | "remote" | "hybrid" | "seeking" | "undecided"; workplaceId: string | null; days: number }; children: number; child: { age: number | null; curriculum: "British" | "American" | "IB" | "Any" | null; swimming: boolean; schoolBusEssential: boolean } };
  lifestyle: { hobbies: string[]; routine: string };
  home: { bedrooms: number; furnishing: "any" | "furnished" | "unfurnished"; areas: string[]; annualRentLimit: number | null };
  transport: { car: "rental" | "none" | "undecided"; maxCommute: number | null };
  money: { monthlyBudget: number | null; cash: number | null; monthlyIncome: number | null; reserve: number; moveDate: string | null; referenceDate: string; priorities: Priority[] };
}
export interface Area { id: string; name: string; description: string; x: number; y: number }
export interface Home { id: string; name: string; areaId: string; bedrooms: number; furnished: boolean; annualRent: number; installments: number; deposit: number; description: string }
export interface School { id: string; name: string; areaId: string; curriculum: "British" | "American" | "IB"; minAge: number; maxAge: number; annualFee: number; installments: number; swimming: boolean; busAreas: Record<string, "met" | "not-met" | "unknown">; admission: "met" | "unknown"; description: string }
export interface Workplace { id: string; name: string; areaId: string; kind: "desk" | "private"; monthlyCost: number; description: string; sourceUrl?: string }
export interface Activity { id: string; name: string; areaId: string; monthlyCost: number; kind: "swimming" }
export interface Provider { id: string; name: string; service: "school" | "housing" | "business" | "documents"; description: string; demoPhone?: string }
export interface Requirement { id: string; label: string; status: "met" | "not-met" | "unknown"; detail: string; essential: boolean }
export interface Journey { person: string; description: string; minutes: number; days: number; mode: string; needsConfirmation?: boolean }
export interface CostLine { label: string; monthly: number; source: "Demo estimate" | "Your input"; account: "household" | "business" }
export interface PaymentEvent { id: string; date: string; label: string; amount: number; account: "household" | "business"; kind: "expense" | "income" | "deposit" | "transfer" }
export interface CashPoint { date: string; balance: number; label: string }
export interface FinanceResult { monthlyHousehold: number; monthlyBusiness: number | null; arrivalCash: number; deposit: number; costs: CostLine[]; events: PaymentEvent[]; householdProjection: CashPoint[] | null; businessProjection: CashPoint[] | null; lowestHousehold: number | null; firstBelowReserve: string | null; partial: boolean }
export interface Plan { id: string; title: string; benefit: string; homeId: string; schoolId: string | null; workplaceId: string | null; activityId: string | null; transport: "rental" | "bus-taxi" | "taxi" | "walk-bus"; status: "ready" | "conditional" | "excluded"; requirements: Requirement[]; journeys: Journey[]; weeklyMinutes: number; finance: FinanceResult; compromise: string; confirmations: string[] }
export interface PlanningResult { alternatives: Plan[]; conditional: Plan[]; all: Plan[]; conflicts: string[]; ready: boolean }
export interface Task { id: string; phase: "Before you move" | "On arrival" | "Settling in"; title: string; detail: string; service?: Provider["service"] }
export interface ProfileEdit { path: string; value: string | number | boolean | null | string[] }
export interface GuideProposal { explanation: string; edits: ProfileEdit[]; revision: number }
