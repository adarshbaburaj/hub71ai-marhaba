import { activities, homes, schools, workplaces } from "./data";
import { calculateFinance } from "./finance";
import { activeChildAges, effectiveProfile, hasChild, hasPartner, schoolChildCount } from "./profile";
import type { Home, Journey, MoveProfile, Plan, PlanRecovery, PlanningResult, Priority, ProfileEdit, Requirement, School, Task, Workplace } from "./types";

// Prepared illustrative estimates only: these are not verified roads or bus routes.
const carMinutes: Record<string, number> = { "maryah|reem": 14, "khalifa|reem": 34, "raha|reem": 27, "khalifa|maryah": 36, "maryah|raha": 30, "khalifa|raha": 17 };
const publicMinutes: Record<string, number | null> = { "maryah|reem": 23, "khalifa|reem": 64, "raha|reem": null, "khalifa|maryah": 68, "maryah|raha": 58, "khalifa|raha": 40 };
const pair = (a: string, b: string): string => [a, b].sort().join("|");
const travel = (a: string, b: string, mode: "car" | "public"): number | null => a === b ? (mode === "car" ? 8 : 18) : (mode === "car" ? carMinutes : publicMinutes)[pair(a, b)] ?? null;
const titles: Record<Priority, string> = { cash: "Preserve cash", travel: "Reduce daily travel", family: "Balance family priorities" };
const moneyText = (value: number): string => `AED ${Math.round(value / 100).toLocaleString("en-US")}`;

function buildCandidate(p: MoveProfile, home: Home, school: School | null, workplace: Workplace | null): Plan {
  const requirements: Requirement[] = [];
  const journeys: Journey[] = [];
  const confirmations: string[] = ["Catalogue homes, schools and providers need outside confirmation. Hub71 is an official ecosystem anchor; prices and journeys remain illustrative.", "Confirm housing availability, payment terms and deposits before committing.", "Business setup fees and approvals require an adviser quote; they are excluded from household costs."];
  const check = (id: string, label: string, status: Requirement["status"], detail: string, essential = true): void => { requirements.push({ id, label, status, detail, essential }); };
  const limit = (id: string, label: string, value: number, maximum: number | null, detail: string): void => check(id, label, maximum === null ? "unknown" : value <= maximum ? "met" : "not-met", maximum === null ? `${label} has not been set. ${detail}` : detail, maximum !== null);
  const childCount = schoolChildCount(p);
  const ages = activeChildAges(p);
  const unpricedCare = ages.filter(age => age !== null && (age < 5 || age > 18));
  if (unpricedCare.length) check("education-care", "Age-appropriate care or education", "unknown", `${unpricedCare.length} ${unpricedCare.length === 1 ? "child needs" : "children need"} a nursery, childcare or further-education quote. These costs are not included in school fees; confirm arrangements and update the budget before choosing.`);
  check("bedrooms", "Bedroom minimum", home.bedrooms >= p.home.bedrooms ? "met" : "not-met", `${home.bedrooms} bedrooms; you need at least ${p.home.bedrooms}.`);
  limit("rent", "Annual rent limit", home.annualRent, p.home.annualRentLimit, `${moneyText(home.annualRent)} per year${p.home.annualRentLimit === null ? "" : ` against ${moneyText(p.home.annualRentLimit)}`}.`);
  check("furnishing", "Furnishing", p.home.furnishing === "any" || home.furnished === (p.home.furnishing === "furnished") ? "met" : "not-met", `${home.furnished ? "Furnished" : "Unfurnished"} catalogue home.`);
  check("workspace", "Founder workspace", p.business.workspace === "remote" ? "met" : p.business.workspace === "undecided" || p.business.workspace === "specialist" || !workplace ? "unknown" : workplace.kind === p.business.workspace ? "met" : "not-met", p.business.workspace === "remote" ? "Remote work; no founder office journey." : p.business.workspace === "specialist" ? "Specialist facility suitability and cost require a quote." : workplace?.id === "harbor-lab" ? "Hub71 is the Al Maryah ecosystem anchor. A desk arrangement and its fee are planning allowances, requiring availability and suitability confirmation." : workplace ? `${workplace.name} provides a ${workplace.kind}; business eligibility still needs a separate review.` : "Choose a supported workspace anchor.");
  if (workplace?.id === "harbor-lab") {
    check("hub71-access", "Hub71 programme access", "unknown", "Programme admission, benefits and workspace access require confirmation. No unconfirmed benefits appear in cash forecasts.", false);
    confirmations.push("Hub71 programme access and workspace availability are unconfirmed. The workspace allowance is synthetic and is not a Hub71 quote.");
  }
  if (p.business.workspace === "remote" && workplace) check("workspace-anchor", "Selected business arrangement", "not-met", "This earlier plan includes an office; your current preference is remote work.");
  else if (p.business.workplaceId && workplace && p.business.workplaceId !== workplace.id) check("workspace-anchor", "Selected founder workplace", "not-met", "This earlier plan uses a different founder workplace from your current selected anchor.");
  if (hasChild(p) && childCount > 1) {
    check("child-capacity", "Multiple children", "met", `${childCount} children share one school in this plan. Fees and bus seats scale; separate grades and waitlists still need confirmation.`, false);
    confirmations.push(`${childCount} children are modelled with one shared school and scaled fees. Confirm places for each child separately.`);
  }
  let activity = null;
  if (school) {
    check("curriculum", "Curriculum", p.household.child.curriculum === null ? "unknown" : p.household.child.curriculum === "Any" || p.household.child.curriculum === school.curriculum ? "met" : "not-met", p.household.child.curriculum === null ? "Curriculum has not been chosen." : `${school.curriculum} curriculum; your preference is ${p.household.child.curriculum}.`);
    const schoolAges = ages.filter(age => age === null || (age >= 5 && age <= 18));
    const unsupportedStage = schoolAges.some(age => age !== null && (age < school.minAge || age > school.maxAge));
    check("school-stage", "School stage", unsupportedStage ? "not-met" : schoolAges.some(age => age === null) ? "unknown" : "met", `Coverage ages ${school.minAge}–${school.maxAge}; children's ages: ${schoolAges.map(age => age ?? "not set").join(", ")}. Each child's actual grade and place need confirmation.`);
    check("admission", "School admission assumption", school.admission, school.admission === "met" ? "Included as a working assumption in this scenario. Verify admission stage and availability with the real school you eventually select." : "Admission availability and stage are unknown in this scenario.");
    if (p.household.child.swimming && !school.swimming) activity = activities.find(a => a.areaId === school.areaId) ?? null;
    if (p.household.child.swimming) check("swimming", "Swimming preference", school.swimming || activity ? "met" : "unknown", school.swimming ? "School swimming is included in the plan assumption." : activity ? `External swimming at ${activity.name}, with extra travel and fees.` : "A suitable swimming provider needs confirmation.", false);
    confirmations.push(childCount > 1
      ? `Confirm entry years, grades, admissions and activities for ${childCount} children. Age ranges are illustrative.`
      : "Confirm the child's entry year, grade, admissions and activities. Age ranges are illustrative.");
  }
  const transport: Plan["transport"] = p.transport.car === "none" ? (["reem", "maryah"].includes(home.areaId) ? "bus-taxi" : "walk-bus") : "rental";
  if (p.transport.car === "undecided") check("car-choice", "Transport decision", "unknown", "Rental-car arrangement shown provisionally. Choose whether the household will have a car.");
  const useSchoolBus = !!school && (p.household.child.schoolBusEssential || transport !== "rental");
  if (school && useSchoolBus) {
    const coverage = school.busAreas[home.areaId] ?? "unknown";
    check("school-bus", "School-bus coverage", coverage, coverage === "met" ? `School-bus coverage is a separate record${childCount > 1 ? ` with a seat allowance for ${childCount} children` : ""}, including a cost allowance.` : coverage === "not-met" ? "This school's bus does not cover the home area. A public bus does not satisfy this requirement." : "School-bus coverage for this home area needs confirmation.");
    if (coverage === "met") journeys.push({ person: childCount > 1 ? "Children" : "Child", description: "Home → school, using the sample school-bus coverage record", minutes: (travel(home.areaId, school.areaId, "car") ?? 20) + 10, days: 5, mode: "School bus · illustrative estimate" });
  }
  if (workplace && p.business.workspace !== "remote") {
    if (transport === "rental") {
      const minutes = school && !useSchoolBus ? (travel(home.areaId, school.areaId, "car") ?? 0) + (travel(school.areaId, workplace.areaId, "car") ?? 0) : travel(home.areaId, workplace.areaId, "car");
      if (minutes !== null) journeys.push({ person: "Founder", description: school && !useSchoolBus ? "Home → school drop-off → founder workplace" : "Home → founder workplace", minutes, days: 5, mode: "One rental car · illustrative estimate" });
    } else {
      const minutes = travel(home.areaId, workplace.areaId, "public");
      if (minutes === null) check("founder-route", "Founder public-transport journey", "unknown", "No prepared public-transport journey covers these locations. The map line is only a plan connection.");
      else journeys.push({ person: "Founder", description: "Home → founder workplace", minutes, days: 5, mode: "Public bus / walk · illustrative estimate" });
    }
  }
  if (hasPartner(p)) {
    const partner = p.household.partner;
    if (["office", "hybrid"].includes(partner.work) && partner.days > 0) {
      const anchor = workplaces.find(w => w.id === partner.workplaceId);
      if (!anchor) check("partner-workplace", "Partner workplace", "unknown", "Choose a supported partner workplace; no commute has been invented.");
      else {
        const minutes = transport === "rental" ? (travel(home.areaId, anchor.areaId, "car") ?? 0) + 5 : travel(home.areaId, anchor.areaId, "public");
        if (minutes === null) check("partner-route", "Partner public-transport journey", "unknown", "No prepared public-transport journey covers this workplace. Confirm a practical route.");
        else journeys.push({ person: "Partner", description: "Home → partner workplace", minutes, days: Math.min(7, Math.max(0, partner.days)), mode: transport === "rental" ? "Separate taxi allowance · illustrative estimate" : "Public bus / walk · illustrative estimate" });
        if (transport === "rental") confirmations.push("The founder uses the one rental car; a separate taxi allowance serves the partner's office days. Confirm that allowance covers actual journeys.");
      }
    } else if (partner.work === "undecided") check("partner-work", "Partner work situation", "unknown", "Work situation has not been chosen; no office or daily commute is assumed.");
  }
  if (activity) journeys.push({ person: "Child activity", description: "School → external swimming activity", minutes: (travel(school!.areaId, activity.areaId, "car") ?? 8) + (transport === "rental" ? 0 : 10), days: 2, mode: transport === "rental" ? "Rental car · illustrative estimate" : "Taxi allowance · illustrative estimate" });
  const adultJourneys = journeys.filter(j => j.person === "Founder" || j.person === "Partner");
  const longest = adultJourneys.length ? Math.max(...adultJourneys.map(j => j.minutes)) : 0;
  limit("commute", "Maximum adult commute", longest, p.transport.maxCommute, adultJourneys.length ? `Longest prepared one-way journey is ${longest} minutes${p.transport.maxCommute === null ? "" : ` against your ${p.transport.maxCommute}-minute limit`}.` : "No confirmed workplace journey is required yet.");
  const finance = calculateFinance(p, { home, school, workplace, activity, transport });
  limit("monthly-budget", "Monthly household spending", finance.monthlyHousehold, p.money.monthlyBudget, `${moneyText(finance.monthlyHousehold)} average household spending${p.money.monthlyBudget === null ? "" : ` against ${moneyText(p.money.monthlyBudget)}`}.`);
  if (p.money.cash !== null) check("arrival-cash", "Cash for arrival", p.money.cash >= finance.arrivalCash ? "met" : "not-met", `${moneyText(finance.arrivalCash)} due on arrival against ${moneyText(p.money.cash)} opening household cash.`);
  else check("arrival-cash", "Cash for arrival", "unknown", "Opening household cash is unknown. Arrival cost comparison is available; affordability is not confirmed.", false);
  if (p.money.reserve > 0) check("reserve", "Minimum household reserve", finance.lowestHousehold === null ? "unknown" : finance.lowestHousehold >= p.money.reserve ? "met" : "not-met", finance.lowestHousehold === null ? "Add household cash, external income and a move date to assess the reserve." : `Lowest projected cash is ${moneyText(finance.lowestHousehold)} against your ${moneyText(p.money.reserve)} reserve.`);
  else if (finance.lowestHousehold !== null) check("cash-runway", "Cash through the first year", finance.lowestHousehold >= 0 ? "met" : "not-met", `Lowest projected household cash is ${moneyText(finance.lowestHousehold)}. A negative balance needs additional funding or lower costs.`);
  if (!finance.householdProjection) confirmations.push("Cash projection unavailable until opening cash, external household income and dated assumptions are provided.");
  if (finance.partial) confirmations.push("Cost totals are partial. Specialist workspace or other unquoted business costs are excluded.");
  const hard = requirements.filter(r => r.essential);
  const status = hard.some(r => r.status === "not-met") ? "excluded" : hard.some(r => r.status === "unknown") ? "conditional" : "ready";
  const weeklyMinutes = journeys.reduce((sum, j) => sum + j.minutes * j.days * 2, 0);
  const compromise = activity ? "Swimming requires an external club, extra travel and an additional fee." : longest >= 35 ? `The longest adult journey is ${longest} minutes each way.` : home.annualRent >= 10_000_000 ? "Shorter journeys come with a larger housing commitment." : "Housing availability and every real-world school place still need confirmation.";
  return { id: `${home.id}::${school?.id ?? "no-school"}::${workplace?.id ?? "remote"}`, title: home.name, benefit: "A connected plan for home, work and daily life.", homeId: home.id, schoolId: school?.id ?? null, workplaceId: workplace?.id ?? null, activityId: activity?.id ?? null, transport, status, requirements, journeys, weeklyMinutes, finance, compromise, confirmations: [...new Set(confirmations)] };
}

function familyScore(plan: Plan, p: MoveProfile): number {
  const school = schools.find(s => s.id === plan.schoolId);
  const home = homes.find(h => h.id === plan.homeId)!;
  return (p.household.child.swimming && !school?.swimming ? 10_000 : 0) + (p.home.areas.length && !p.home.areas.includes(home.areaId) ? 5_000 : 0) + plan.weeklyMinutes;
}

function ranked(plans: Plan[], p: MoveProfile, priority: Priority): Plan[] {
  const score = (plan: Plan): number => priority === "cash" ? plan.finance.arrivalCash : priority === "travel" ? plan.weeklyMinutes : familyScore(plan, p);
  return [...plans].sort((a, b) => score(a) - score(b) || a.finance.monthlyHousehold - b.finance.monthlyHousehold || a.id.localeCompare(b.id));
}

function candidates(input: MoveProfile): Plan[] {
  const p = effectiveProfile(input);
  const knownWorkplace = workplaces.find(w => w.id === p.business.workplaceId);
  const choices: (Workplace | null)[] = p.business.workspace === "remote" ? [null] : knownWorkplace ? [knownWorkplace] : p.business.workplaceId || p.business.workspace === "specialist" ? [null] : workplaces.filter(w => p.business.workspace === "undecided" || w.kind === p.business.workspace);
  const schoolChoices: (School | null)[] = schoolChildCount(p) > 0 ? schools : [null];
  return homes.flatMap(home => schoolChoices.flatMap(school => choices.map(workplace => buildCandidate(p, home, school, workplace))));
}

function pickAlternatives(pool: Plan[], p: MoveProfile, priorities: Priority[]): Plan[] {
  const alternatives: Plan[] = [];
  for (const priority of priorities) {
    const ordered = ranked(pool, p, priority).filter(plan => !alternatives.some(previous => previous.id === plan.id));
    const selected = ordered.find(plan => !alternatives.some(previous => previous.homeId === plan.homeId)) ?? ordered[0];
    if (!selected) continue;
    selected.title = titles[priority];
    selected.benefit = priority === "cash" ? `${moneyText(selected.finance.arrivalCash)} in arrival payments, with ${moneyText(selected.finance.monthlyHousehold)} average monthly household costs.` : priority === "travel" ? `${selected.weeklyMinutes} total household travel minutes per week in the prepared estimates.` : selected.activityId ? "Meets the school preference with a nearby external swimming option." : "School and home connect around your working week.";
    alternatives.push(selected);
    if (alternatives.length === 3) break;
  }
  return alternatives;
}

/** Explicit what-if proposals; original requirements, cash and income remain intact. */
function recoveryOptions(p: MoveProfile, original: Plan[]): PlanRecovery[] {
  const variants: { profile: MoveProfile; edits: ProfileEdit[]; plans: Plan[] }[] = [{ profile: p, edits: [], plans: original }];
  if (p.transport.car !== "none") {
    const profile = structuredClone(p);
    profile.transport.car = "none";
    variants.push({ profile, edits: [{ path: "transport.car", value: "none" }], plans: candidates(profile) });
  }
  // A remote phase is a deliberate option for desk-based work, never a substitute for specialist facilities.
  if (["desk", "private", "undecided"].includes(p.business.workspace)) {
    const profile = structuredClone(p);
    profile.business.workspace = "remote";
    variants.push({ profile, edits: [{ path: "business.workspace", value: "remote" }], plans: candidates(profile) });
  }
  const recoveries: PlanRecovery[] = [];
  for (const variant of variants) for (const candidate of variant.plans) {
    const home = homes.find(item => item.id === candidate.homeId)!;
    const school = schools.find(item => item.id === candidate.schoolId) ?? null;
    const workplace = workplaces.find(item => item.id === candidate.workplaceId) ?? null;
    const next = structuredClone(variant.profile);
    const edits = [...variant.edits];
    const change = (path: string, value: ProfileEdit["value"]): void => {
      const keys = path.split(".");
      let target = next as unknown as Record<string, unknown>;
      for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
      target[keys.at(-1)!] = value;
      edits.push({ path, value });
    };
    for (const requirement of candidate.requirements.filter(item => item.essential && item.status === "not-met")) {
      if (requirement.id === "rent") change("home.annualRentLimit", home.annualRent);
      if (requirement.id === "furnishing") change("home.furnishing", "any");
      if (requirement.id === "curriculum") change("household.child.curriculum", "Any");
      if (requirement.id === "workspace" && workplace) change("business.workspace", workplace.kind);
      if (requirement.id === "commute") change("transport.maxCommute", Math.max(...candidate.journeys.filter(journey => ["Founder", "Partner"].includes(journey.person)).map(journey => journey.minutes)));
      if (requirement.id === "monthly-budget") change("money.monthlyBudget", Math.ceil(candidate.finance.monthlyHousehold / 10_000) * 10_000);
    }
    if (next.transport.car === "undecided") change("transport.car", "rental");
    const plan = buildCandidate(effectiveProfile(next), home, school, workplace);
    const remaining = plan.requirements.filter(item => item.essential && item.status !== "met");
    const cashGap = p.money.cash === null ? null : Math.max(0, plan.finance.arrivalCash - p.money.cash, plan.finance.lowestHousehold === null ? 0 : Math.max(0, p.money.reserve) - plan.finance.lowestHousehold);
    const remote = edits.some(edit => edit.path === "business.workspace" && edit.value === "remote");
    const noCar = edits.some(edit => edit.path === "transport.car" && edit.value === "none");
    const title = remote ? "Begin with a remote-work phase" : noCar ? "Try arriving without a car" : edits.length ? "Compare a more flexible budget" : cashGap ? "Build your arrival buffer" : "Complete the missing pieces";
    const nextStep = cashGap && cashGap > 0
      ? plan.finance.lowestHousehold === null
        ? `Secure at least ${moneyText(cashGap)} more for arrival alone. Add expected income to check the full year's cash needs and reserve.`
        : `Secure ${moneyText(cashGap)} more opening cash to cover the priced payments and your reserve, then update your actual cash. A later move helps only if you build that buffer.`
      : remaining.some(item => item.id === "education-care") ? "Get age-appropriate childcare or education quotes, then add them to your spending allowance."
        : remaining.some(item => item.id === "bedrooms") ? `Ask for a home with at least ${p.home.bedrooms} bedrooms; this catalogue does not yet cover that requirement.`
          : remaining.some(item => item.id === "school-stage") ? "Confirm an age and suitable grade for every child; different schools may be needed."
            : remaining.some(item => item.id === "workspace") ? "Confirm a suitable workspace and its quote before finalising the business setup."
              : remaining.length ? `Confirm ${remaining.map(item => item.label.toLowerCase()).join(", ")} before relying on this option.`
                : cashGap === null ? "Add your available cash and income to check affordability before committing."
                  : "Review the proposed changes, then check actual availability and quotes before committing.";
    const explanation = `${home.name}: ${moneyText(plan.finance.monthlyHousehold)} monthly and ${moneyText(plan.finance.arrivalCash)} on arrival. ${remote ? "Use this phase only if your business can operate remotely. " : ""}${edits.length ? "The changes below are a scenario for you to review; your answers have not changed. " : "Your current answers are retained. "}${plan.status === "excluded" ? "Further changes or funding are still required." : plan.status === "conditional" ? "Some essential details still need confirmation." : "This scenario meets the calculated constraints after the proposed changes."}`;
    recoveries.push({ id: `${remote ? "remote" : noCar ? "no-car" : "flexible"}:${plan.id}`, title, explanation, edits, plan, cashGap, nextStep });
  }
  const statusOrder = { ready: 0, conditional: 1, excluded: 2 };
  recoveries.sort((a, b) => statusOrder[a.plan.status] - statusOrder[b.plan.status]
    || a.plan.requirements.filter(item => item.essential && item.status === "not-met").length - b.plan.requirements.filter(item => item.essential && item.status === "not-met").length
    || (a.cashGap ?? 0) - (b.cashGap ?? 0)
    || a.edits.length - b.edits.length
    || a.plan.finance.monthlyHousehold - b.plan.finance.monthlyHousehold
    || a.id.localeCompare(b.id));
  const chosen: PlanRecovery[] = [];
  for (const recovery of recoveries) {
    if (chosen.some(item => item.plan.homeId === recovery.plan.homeId && item.title === recovery.title)) continue;
    chosen.push(recovery);
    if (chosen.length === 3) break;
  }
  return chosen;
}

export function generatePlans(input: MoveProfile): PlanningResult {
  const p = effectiveProfile(input);
  const ready = p.intent !== null && p.household.composition !== null;
  if (!ready) return { alternatives: [], conditional: [], all: [], conflicts: [], recoveries: [], ready: false };
  const all = candidates(p);
  const priorities = [...new Set([...p.money.priorities, "cash", "travel", "family"])] as Priority[];
  // The UI renders recoveryOptions when strict matches are absent. Promoting
  // excluded/unknown plans to ready here would falsely confirm affordability.
  const viable = all.filter(plan => plan.status === "ready");
  const alternatives = pickAlternatives(viable, p, priorities);
  const conditional = ranked(all.filter(plan => plan.status === "conditional"), p, priorities[0]).slice(0, 3);
  const conflictCounts = new Map<string, { detail: string; count: number }>();
  if (!viable.length) for (const plan of all) for (const requirement of plan.requirements.filter(r => r.essential && r.status === "not-met")) {
    const existing = conflictCounts.get(requirement.id);
    conflictCounts.set(requirement.id, { detail: requirement.detail, count: (existing?.count ?? 0) + 1 });
  }
  const conflicts = [...conflictCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3).map(item => item.detail);
  const recoveries = viable.length ? [] : recoveryOptions(p, all);
  return { alternatives, conditional, all, conflicts, recoveries, ready };
}

/** Find a previously selected combination even after an edit excludes it. */
export function getPlan(p: MoveProfile, id: string): Plan | undefined {
  const existing = candidates(p).find(plan => plan.id === id);
  if (existing) return existing;
  const [homeId, schoolId, workplaceId] = id.split("::");
  const home = homes.find(item => item.id === homeId);
  const school = schoolId === "no-school" ? null : schools.find(item => item.id === schoolId);
  const workplace = workplaceId === "remote" ? null : workplaces.find(item => item.id === workplaceId);
  if (!home || school === undefined || workplace === undefined) return undefined;
  const active = effectiveProfile(p);
  // A branch change must not resurrect school costs; select the new household result instead.
  if ((schoolChildCount(active) > 0) !== !!school) return undefined;
  return buildCandidate(active, home, school, workplace);
}

export function buildTasks(input: MoveProfile, plan: Plan): Task[] {
  const p = effectiveProfile(input);
  const childCount = schoolChildCount(p);
  const tasks: Task[] = [
    { id: "confirm-plan", phase: "Before you move", title: "Review the plan's assumptions", detail: `${plan.requirements.filter(r => r.essential && r.status === "unknown").length} essential details need confirmation. Catalogue records and travel estimates need outside verification.` },
    { id: "business-route", phase: "Before you move", title: "Confirm the business setup route", detail: "Prepare questions about permitted activity, documents, eligibility and unquoted setup costs.", service: "business" },
    { id: "document-checklist", phase: "Before you move", title: "Prepare the document checklist", detail: "Ask an adviser which business and household documents need preparation or certification. This prototype does not collect files or passports.", service: "documents" },
    { id: "home-terms", phase: "Before you move", title: "Confirm the home and payment schedule", detail: `Check availability, deposit and ${moneyText(plan.finance.arrivalCash)} of planned arrival payments before signing.`, service: "housing" },
  ];
  if (hasChild(p) && plan.schoolId) tasks.push({ id: "school-admission", phase: "Before you move", title: childCount > 1 ? `Confirm school places for ${childCount} children` : "Confirm the child's school place", detail: "Ask about entry year, grade equivalence, fees, admission availability and activities.", service: "school" });
  if (plan.requirements.some(requirement => requirement.id === "education-care")) tasks.push({ id: "childcare-quote", phase: "Before you move", title: "Arrange age-appropriate care or education", detail: "Obtain nursery, childcare or further-education quotes for children outside the school age range, then update your spending plan. These costs are not included yet.", service: "school" });
  if (plan.requirements.some(r => r.id === "school-bus")) tasks.push({ id: "school-transport", phase: "Before you move", title: "Confirm school-bus coverage", detail: "Check the exact home address, pickup times, fees and coverage independently of public transport.", service: "school" });
  tasks.push(
    { id: "health-utilities", phase: "On arrival", title: "Arrange insurance and utilities", detail: "Request actual coverage and activation quotes; the living-cost allowance is illustrative.", service: "housing" },
    { id: "travel-check", phase: "On arrival", title: "Test the household journeys", detail: "Check the actual work and school chains, timetables and transport allowance before relying on prepared estimates." },
    { id: "cash-check", phase: "Settling in", title: "Review the first month of spending", detail: "Replace planning allowances with actual bills and check upcoming rent and school instalments." },
  );
  if (hasPartner(p) && p.household.partner.work === "seeking") tasks.push({ id: "partner-career", phase: "Settling in", title: "Prepare the partner's career questions", detail: "Identify suitable career support without assuming a workplace or a commute." });
  if (p.household.child.swimming && childCount > 0) tasks.push({ id: "activity-check", phase: "Settling in", title: "Confirm swimming arrangements", detail: "Check the activity's availability, schedule, fees and travel implications.", service: "school" });
  return tasks;
}

/** Prepared Hub71 → area minutes for UI. */
export function travelFromHub71(areaId: string, mode: "car" | "public" = "car"): number | null {
  return travel("maryah", areaId, mode);
}

export function travelBetweenAreas(fromAreaId: string, toAreaId: string, mode: "car" | "public" = "car"): number | null {
  return travel(fromAreaId, toAreaId, mode);
}
