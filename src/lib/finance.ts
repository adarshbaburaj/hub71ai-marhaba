import { effectiveProfile, hasChild, hasPartner } from "./profile";
import type { Activity, CashPoint, CostLine, FinanceResult, Home, MoveProfile, PaymentEvent, Plan, School, Workplace } from "./types";

export interface FinanceInputs {
  home: Home;
  school?: School | null;
  workplace?: Workplace | null;
  activity?: Activity | null;
  transport: Plan["transport"];
  transportMonthly?: number;
  transportDeposit?: number;
  livingMonthly?: number;
  setupCost?: number;
}

const monthlyEquivalent = (annual: number): number => Math.round(annual / 12);
const validDate = (value: string | null): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/** Add calendar months, clamping 29–31 to the target month's final day. */
export function monthDate(date: string, months: number, day?: number): string {
  const [year, month, originalDay] = date.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
  first.setUTCDate(Math.min(day ?? originalDay, lastDay));
  return first.toISOString().slice(0, 10);
}

function offsetDays(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function projection(opening: number, date: string, events: PaymentEvent[]): CashPoint[] {
  let balance = opening;
  return [{ date, balance, label: "Opening cash, using your reference date" }, ...events.map(event => {
    balance += event.amount;
    return { date: event.date, balance, label: event.label };
  })];
}

export function calculateFinance(input: MoveProfile, options: FinanceInputs): FinanceResult {
  const p = effectiveProfile(input);
  const school = hasChild(p) ? options.school : null;
  const activity = hasChild(p) ? options.activity : null;
  const workplace = p.business.workspace === "remote" ? null : options.workplace;
  const living = options.livingMonthly ?? 500_000;
  const partnerTravels = hasPartner(p) && ["office", "hybrid"].includes(p.household.partner.work) && p.household.partner.days > 0;
  const schoolBus = !!school && (p.household.child.schoolBusEssential || options.transport !== "rental");
  const baseTransport = options.transport === "rental" ? 280_000 + (partnerTravels ? 60_000 : 0) : options.transport === "bus-taxi" ? 90_000 : options.transport === "taxi" ? 160_000 : 45_000;
  const transport = options.transportMonthly ?? baseTransport + (schoolBus ? 25_000 : 0) + (activity ? 10_000 : 0);
  const rentalDeposit = options.transportDeposit ?? (options.transport === "rental" ? 150_000 : 0);
  const setup = options.setupCost ?? 400_000;
  const costs: CostLine[] = [
    { label: "Housing (annual rent averaged)", monthly: monthlyEquivalent(options.home.annualRent), source: "Demo estimate", account: "household" },
    ...(school ? [{ label: "School (annual fee averaged)", monthly: monthlyEquivalent(school.annualFee), source: "Demo estimate" as const, account: "household" as const }] : []),
    { label: "Transport and supported travel package", monthly: transport, source: "Demo estimate", account: "household" },
    { label: "Living costs, utilities and insurance allowance", monthly: living, source: "Demo estimate", account: "household" },
    ...(activity ? [{ label: "External swimming activity", monthly: activity.monthlyCost, source: "Demo estimate" as const, account: "household" as const }] : []),
  ];
  const unknownBusinessQuote = p.business.workspace === "specialist" || (p.business.workspace !== "remote" && !workplace);
  if (p.business.includeFinances) {
    if (workplace) costs.push({ label: workplace.id === "harbor-lab" ? "Workspace allowance near Hub71 (not a Hub71 price)" : "Founder workspace", monthly: workplace.monthlyCost, source: "Demo estimate", account: "business" });
    if (p.business.monthlySpending !== null) costs.push({ label: "Other business spending", monthly: p.business.monthlySpending, source: "Your input", account: "business" });
    if (p.business.founderPay > 0) costs.push({ label: "Founder pay (transfer to household)", monthly: p.business.founderPay, source: "Your input", account: "business" });
  }
  const monthlyHousehold = costs.filter(c => c.account === "household").reduce((sum, c) => sum + c.monthly, 0);
  const monthlyBusiness = !p.business.includeFinances || p.business.monthlySpending === null || unknownBusinessQuote ? null : costs.filter(c => c.account === "business").reduce((sum, c) => sum + c.monthly, 0);
  const firstRent = Math.round(options.home.annualRent / options.home.installments);
  const firstSchool = school ? Math.round(school.annualFee / school.installments) : 0;
  const deposit = options.home.deposit + rentalDeposit;
  const arrivalCash = firstRent + firstSchool + deposit + setup;
  const events: PaymentEvent[] = [];
  // An undecided arrival can use the user's reference date for an explicitly
  // illustrative schedule. A supplied invalid arrival is never replaced silently.
  const reference = validDate(p.money.referenceDate) ? p.money.referenceDate : null;
  const date = validDate(p.money.moveDate) ? p.money.moveDate : p.money.moveDate === null ? reference : null;
  if (date) {
    const add = (id: string, due: string, label: string, amount: number, account: PaymentEvent["account"], kind: PaymentEvent["kind"]): void => {
      if (amount !== 0) events.push({ id, date: due, label, amount, account, kind });
    };
    const instalments = (id: string, label: string, amount: number, count: number): void => {
      const installment = Math.round(amount / count);
      for (let i = 0; i < count; i++) add(`${id}-${i}`, monthDate(date, Math.floor(i * 12 / count)), `${label} ${i + 1}/${count}`, -(i === count - 1 ? amount - installment * (count - 1) : installment), "household", "expense");
    };
    instalments("rent", "Rent instalment", options.home.annualRent, options.home.installments);
    if (school) instalments("school", "School instalment", school.annualFee, school.installments);
    add("home-deposit", date, "Refundable housing deposit, return not assumed", -options.home.deposit, "household", "deposit");
    add("transport-deposit", date, "Refundable rental-car deposit, return not assumed", -rentalDeposit, "household", "deposit");
    add("arrival-setup", date, "Moving and household setup allowance", -setup, "household", "expense");
    for (let month = 0; month < 12; month++) {
      // Illustrative bills precede receipts within each monthly period. Relative
      // dates keep all twelve periods inside the horizon, including day-1 anchors.
      const periodEnd = monthDate(date, month + 1);
      const billDate = offsetDays(periodEnd, -10);
      const incomeDate = offsetDays(periodEnd, -5);
      add(`living-${month}`, billDate, "Living costs, utilities and insurance allowance", -living, "household", "expense");
      add(`transport-${month}`, billDate, "Transport package", -transport, "household", "expense");
      if (activity) add(`activity-${month}`, billDate, "External swimming activity", -activity.monthlyCost, "household", "expense");
      if (p.money.monthlyIncome !== null) add(`income-${month}`, incomeDate, "External household income", p.money.monthlyIncome, "household", "income");
      if (p.business.includeFinances) {
        if (workplace) add(`workspace-${month}`, billDate, workplace.id === "harbor-lab" ? "Workspace allowance near Hub71 (not a Hub71 price)" : "Founder workspace", -workplace.monthlyCost, "business", "expense");
        if (p.business.monthlySpending !== null) add(`business-spending-${month}`, billDate, "Other business spending", -p.business.monthlySpending, "business", "expense");
        if (p.business.monthlyReceipts !== null) add(`business-income-${month}`, incomeDate, "Business cash receipts", p.business.monthlyReceipts, "business", "income");
        add(`founder-pay-business-${month}`, incomeDate, "Founder pay to household (internal transfer)", -p.business.founderPay, "business", "transfer");
        add(`founder-pay-household-${month}`, incomeDate, "Founder pay from business (internal transfer)", p.business.founderPay, "household", "transfer");
      }
    }
    events.sort((a, b) => a.date.localeCompare(b.date) || (a.amount < 0 ? 0 : 1) - (b.amount < 0 ? 0 : 1) || a.id.localeCompare(b.id));
  }
  const referenceDate = reference ?? date;
  const chronologyKnown = !!date && !!referenceDate && referenceDate <= date;
  const householdProjection = chronologyKnown && p.money.cash !== null && p.money.monthlyIncome !== null ? projection(p.money.cash, referenceDate, events.filter(e => e.account === "household")) : null;
  const businessProjection = chronologyKnown && p.business.includeFinances && p.business.cash !== null && p.business.monthlyReceipts !== null && monthlyBusiness !== null ? projection(p.business.cash, referenceDate, events.filter(e => e.account === "business")) : null;
  const lowestHousehold = householdProjection ? Math.min(...householdProjection.map(point => point.balance)) : null;
  const firstBelowReserve = householdProjection?.find(point => point.balance < p.money.reserve)?.date ?? null;
  return {
    monthlyHousehold, monthlyBusiness, arrivalCash, deposit, costs, events, householdProjection, businessProjection, lowestHousehold, firstBelowReserve,
    // The prototype does not price business setup approvals; enabled business totals stay partial.
    partial: p.money.moveDate === null || unknownBusinessQuote || (!!hasChild(p) && !school) || p.business.includeFinances,
  };
}

/** The brief's fictional arithmetic fixture, returned in AED for easy verification. */
export function financeFixture(): { initialPayment: number; cashRemaining: number; monthlyExpenses: number } {
  const p: MoveProfile = {
    intent: "move", business: { sector: "Software", description: "", workspace: "remote", specialistNeeds: "", teamSize: 1, workplaceId: null, includeFinances: false, cash: null, monthlyReceipts: null, monthlySpending: null, founderPay: 0 },
    household: { composition: "family", partner: { work: "remote", workplaceId: null, days: 0 }, children: 1, child: { age: 8, curriculum: "British", swimming: false, schoolBusEssential: false } },
    lifestyle: { hobbies: [], routine: "" },
    home: { bedrooms: 2, furnishing: "any", areas: [], annualRentLimit: null }, transport: { car: "none", maxCommute: null },
    money: { monthlyBudget: null, cash: 10_000_000, monthlyIncome: 1_500_000, reserve: 0, moveDate: "2027-01-15", referenceDate: "2027-01-15", priorities: ["cash"] },
  };
  const result = calculateFinance(p, {
    home: { id: "fixture-home", name: "Fictional fixture home", areaId: "reem", bedrooms: 2, furnished: false, annualRent: 7_200_000, installments: 4, deposit: 360_000, description: "Arithmetic fixture" },
    school: { id: "fixture-school", name: "Fictional fixture school", areaId: "reem", curriculum: "British", minAge: 5, maxAge: 18, annualFee: 2_400_000, installments: 3, swimming: false, busAreas: { reem: "met" }, admission: "met", description: "Arithmetic fixture" },
    transport: "walk-bus", transportMonthly: 0, transportDeposit: 0,
  });
  return { initialPayment: result.arrivalCash / 100, cashRemaining: (p.money.cash! - result.arrivalCash) / 100, monthlyExpenses: result.monthlyHousehold / 100 };
}
