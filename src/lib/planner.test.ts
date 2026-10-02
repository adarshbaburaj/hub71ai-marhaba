import { describe, expect, it } from "vitest";
import { areas, homes, schools, workplaces } from "./data";
import { buildTasks, generatePlans, getPlan } from "./planner";
import { applyProfileEdits } from "./guide";
import { activeChildAges, blankProfile, effectiveProfile, hasChild, hasPartner, sampleProfile } from "./profile";

describe("profile branches", () => {
  it("starts without made-up cash, income or household answers", () => {
    const p = blankProfile();
    expect(p.money.cash).toBeNull();
    expect(p.money.monthlyIncome).toBeNull();
    expect(generatePlans(p).ready).toBe(false);
  });

  it("omits dormant branches without destroying previous answers", () => {
    const p = sampleProfile();
    p.household.composition = "solo";
    const active = effectiveProfile(p);
    expect(hasPartner(active)).toBe(false);
    expect(hasChild(active)).toBe(false);
    expect(active.household.children).toBe(0);
    expect(active.household.partner.workplaceId).toBeNull();
    expect(p.household.child.age).toBe(8);
    expect(p.household.partner.workplaceId).toBe("central-studio");
  });
});

describe("families and useful recovery scenarios", () => {
  it("supports a single parent and retains dormant partner answers", () => {
    const p = sampleProfile();
    p.household.composition = "single-parent";
    p.household.children = 2;
    p.household.childAges = [7, 11];
    p.money.monthlyBudget = 4_000_000;
    p.money.cash = 50_000_000;
    const result = generatePlans(p);
    expect(hasChild(p)).toBe(true);
    expect(hasPartner(p)).toBe(false);
    expect(p.household.partner.workplaceId).toBe("central-studio");
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives.every(plan => plan.journeys.every(journey => journey.person !== "Partner"))).toBe(true);
    expect(buildTasks(p, result.alternatives[0]).some(task => task.title.includes("2 children"))).toBe(true);
  });

  it("checks the stage of every child without copying a legacy age to siblings", () => {
    const p = sampleProfile();
    p.household.children = 2;
    expect(activeChildAges(p)).toEqual([8, null]);
    const unknown = generatePlans(p).all.find(plan => plan.schoolId === "garden-school")!;
    expect(unknown.requirements.find(requirement => requirement.id === "school-stage")?.status).toBe("unknown");
    expect(unknown.finance.partial).toBe(true);
    p.household.childAges = [8, 18];
    const unsupported = generatePlans(p).all.find(plan => plan.schoolId === "garden-school")!;
    expect(unsupported.requirements.find(requirement => requirement.id === "school-stage")?.status).toBe("not-met");
    p.household.composition = "solo";
    expect(activeChildAges(effectiveProfile(p))).toEqual([]);
    expect(p.household.childAges).toEqual([8, 18]);
  });

  it("keeps a preschool-only family useful with an unpriced childcare task", () => {
    const p = sampleProfile();
    p.household.childAges = [2];
    const result = generatePlans(p);
    expect(result.alternatives).toHaveLength(0);
    expect(result.conditional.length).toBeGreaterThan(0);
    const plan = result.conditional[0];
    expect(plan.schoolId).toBeNull();
    expect(plan.finance.partial).toBe(true);
    expect(plan.finance.costs.some(cost => cost.label.startsWith("School"))).toBe(false);
    expect(buildTasks(p, plan).some(task => task.id === "childcare-quote")).toBe(true);
    expect(result.recoveries.some(recovery => recovery.nextStep.includes("childcare"))).toBe(true);
  });

  it("evaluates explicit constraint edits without changing the current profile", () => {
    const p = sampleProfile();
    p.home.annualRentLimit = 100_000;
    const previous = structuredClone(p);
    const result = generatePlans(p);
    expect(result.alternatives).toHaveLength(0);
    expect(result.recoveries.length).toBeGreaterThan(0);
    for (const recovery of result.recoveries) {
      expect(recovery.edits.some(edit => edit.path === "home.annualRentLimit")).toBe(true);
      const proposed = applyProfileEdits(p, recovery.edits);
      const reevaluated = getPlan(proposed, recovery.plan.id)!;
      expect(reevaluated.status).toBe(recovery.plan.status);
      expect(reevaluated.finance.monthlyHousehold).toBe(recovery.plan.finance.monthlyHousehold);
      expect(recovery.edits.some(edit => ["money.cash", "money.monthlyIncome", "money.reserve", "household.children", "household.childAges"].includes(edit.path))).toBe(false);
    }
    expect(p).toEqual(previous);
    expect(result.all.every(plan => plan.requirements.find(requirement => requirement.id === "rent")?.essential)).toBe(true);
  });

  it("provides a funding target instead of claiming zero-cash scenarios are affordable", () => {
    const p = sampleProfile();
    p.money.cash = 0;
    p.money.monthlyIncome = 0;
    p.money.reserve = 0;
    const result = generatePlans(p);
    expect(result.alternatives).toHaveLength(0);
    expect(result.recoveries).toHaveLength(3);
    for (const recovery of result.recoveries) {
      expect(recovery.plan.status).toBe("excluded");
      expect(recovery.cashGap).toBeGreaterThan(recovery.plan.finance.arrivalCash);
      expect(recovery.nextStep).toContain("more opening cash");
      expect(recovery.plan.requirements.find(requirement => requirement.id === "cash-runway")?.status).toBe("not-met");
    }
    expect(p.money.cash).toBe(0);
  });

  it("keeps unsupported specialist and child stages visible in recovery previews", () => {
    const p = sampleProfile();
    p.business.workspace = "specialist";
    p.business.workplaceId = null;
    p.household.childAges = [20];
    const result = generatePlans(p);
    expect(result.recoveries.length).toBeGreaterThan(0);
    expect(result.recoveries.every(recovery => recovery.plan.status !== "ready")).toBe(true);
    expect(result.recoveries.every(recovery => recovery.edits.every(edit => edit.path !== "business.workspace"))).toBe(true);
    expect(result.recoveries[0].plan.requirements.find(requirement => requirement.id === "education-care")?.status).toBe("unknown");
  });

  it.each(["large-home", "large-family", "tiny-budget", "specialist-infant", "combined-extreme"])("offers concrete recovery paths for %s without inventing feasibility", (scenario) => {
    let p = sampleProfile();
    const edits = [];
    if (["large-home", "combined-extreme"].includes(scenario)) edits.push({ path: "home.bedrooms", value: 10 });
    if (["large-family", "combined-extreme"].includes(scenario)) edits.push({ path: "household.children", value: 20 }, { path: "household.childAges", value: Array.from({ length: 20 }, (_, index) => index % 2 ? null : 8) });
    if (["tiny-budget", "combined-extreme"].includes(scenario)) edits.push({ path: "money.monthlyBudget", value: 1 });
    if (["specialist-infant", "combined-extreme"].includes(scenario)) edits.push({ path: "business.workspace", value: "specialist" }, { path: "business.workplaceId", value: null });
    if (scenario === "specialist-infant") edits.push({ path: "household.childAges", value: [1] });
    p = applyProfileEdits(p, edits);
    const previous = structuredClone(p);
    const result = generatePlans(p);
    expect(result.recoveries).toHaveLength(3);
    expect(result.alternatives).toHaveLength(0);
    for (const recovery of result.recoveries) {
      expect(recovery.nextStep.length).toBeGreaterThan(30);
      expect(recovery.explanation).not.toMatch(/guarantee|always feasible/i);
      const proposed = applyProfileEdits(p, recovery.edits);
      expect(getPlan(proposed, recovery.plan.id)?.status).toBe(recovery.plan.status);
      if (scenario !== "tiny-budget") expect(recovery.plan.status).not.toBe("ready");
    }
    expect(p).toEqual(previous);
  });
});

describe("connected plans", () => {
  it("contains the bounded fictional dataset and sample anchors", () => {
    expect(areas).toHaveLength(4);
    expect(homes.length).toBeGreaterThanOrEqual(11);
    expect(homes.some(home => home.bedrooms === 1)).toBe(true);
    expect(homes.some(home => home.bedrooms >= 4)).toBe(true);
    expect(schools).toHaveLength(6);
    expect(workplaces).toHaveLength(3);
    expect(workplaces.find(w => w.id === "harbor-lab")).toBeDefined();
    expect(workplaces.find(w => w.id === "central-studio")).toBeDefined();
  });

  it("offers three genuinely distinct alternatives from the sample", () => {
    const result = generatePlans(sampleProfile());
    expect(result.ready).toBe(true);
    expect(result.alternatives).toHaveLength(3);
    expect(new Set(result.alternatives.map(plan => plan.homeId)).size).toBe(3);
    expect(result.alternatives.every(plan => plan.status === "ready")).toBe(true);
    expect(result.alternatives.map(plan => plan.title)).toEqual(["Preserve cash", "Reduce daily travel", "Balance family priorities"]);
  });

  it("minimises arrival cash before using recurring cost to break ties", () => {
    const originalLength = homes.length;
    const base = homes[0];
    homes.push(
      { ...base, id: "test-low-arrival", annualRent: 2_400_000, deposit: 0 },
      { ...base, id: "test-low-recurring", annualRent: 1_200_000, deposit: 350_000 },
    );
    try {
      const p = sampleProfile();
      p.household.composition = "solo";
      p.business.workspace = "remote";
      p.home.annualRentLimit = null;
      p.home.areas = [];
      p.money.cash = null;
      p.money.reserve = 0;
      p.money.monthlyBudget = null;
      p.money.priorities = ["cash", "travel", "family"];
      const result = generatePlans(p);
      const cheaperArrival = result.all.find(plan => plan.homeId === "test-low-arrival")!;
      const cheaperMonthly = result.all.find(plan => plan.homeId === "test-low-recurring")!;
      expect(cheaperArrival.status).toBe("ready");
      expect(cheaperMonthly.status).toBe("ready");
      expect(cheaperArrival.finance.arrivalCash).toBeLessThan(cheaperMonthly.finance.arrivalCash);
      expect(cheaperArrival.finance.arrivalCash + cheaperArrival.finance.monthlyHousehold).toBeGreaterThan(cheaperMonthly.finance.arrivalCash + cheaperMonthly.finance.monthlyHousehold);
      expect(result.alternatives[0].homeId).toBe("test-low-arrival");
    } finally {
      homes.splice(originalLength);
    }
  });

  it("removing the car recalculates suitability, journeys and money", () => {
    const p = sampleProfile();
    const carResult = generatePlans(p);
    const cashPlan = carResult.alternatives[0];
    expect(homes.find(home => home.id === cashPlan.homeId)?.areaId).toBe("khalifa");
    p.transport.car = "none";
    const noCarResult = generatePlans(p);
    expect(noCarResult.alternatives.length).toBeGreaterThan(0);
    const formerlySelected = getPlan(p, cashPlan.id)!;
    expect(formerlySelected.status).toBe("excluded");
    expect(formerlySelected.requirements.find(r => r.id === "commute")?.status).toBe("not-met");
    expect(formerlySelected.finance.monthlyHousehold).not.toBe(cashPlan.finance.monthlyHousehold);
    expect(noCarResult.alternatives.every(plan => plan.transport !== "rental")).toBe(true);
    expect(noCarResult.alternatives.every(plan => plan.requirements.find(r => r.id === "school-bus")?.status === "met")).toBe(true);
  });

  it("calculates school drop-off as one chain and assigns the partner separate travel", () => {
    const result = generatePlans(sampleProfile());
    const plan = result.all.find(item => item.homeId === "garden-flat" && item.schoolId === "garden-school")!;
    const founder = plan.journeys.find(j => j.person === "Founder")!;
    expect(founder.description).toContain("school drop-off");
    expect(founder.minutes).toBe(44);
    expect(plan.journeys.find(j => j.person === "Partner")?.mode).toContain("Separate taxi");
  });

  it("keeps unknown admission conditional and never silently changes curriculum", () => {
    const result = generatePlans(sampleProfile());
    const unknownAdmission = result.all.find(plan => plan.homeId === "reed-apartment" && plan.schoolId === "quay-school")!;
    expect(unknownAdmission.status).toBe("conditional");
    const wrongCurriculum = result.all.find(plan => plan.homeId === "reed-apartment" && plan.schoolId === "horizon-school")!;
    expect(wrongCurriculum.status).toBe("excluded");
    expect(wrongCurriculum.requirements.find(r => r.id === "curriculum")?.status).toBe("not-met");
  });

  it("keeps unknown school-bus coverage separate from prepared public travel", () => {
    const p = sampleProfile();
    p.transport.car = "none";
    p.transport.maxCommute = null;
    const plan = generatePlans(p).all.find(item => item.homeId === "reed-apartment" && item.schoolId === "tide-school")!;
    expect(plan.requirements.find(r => r.id === "school-bus")?.status).toBe("unknown");
    expect(plan.status).toBe("conditional");
  });

  it("supports a partial first pass with conditional options and useful next steps", () => {
    const p = sampleProfile();
    p.household.child.age = null;
    p.household.child.curriculum = null;
    p.money.reserve = 0;
    p.money.cash = null;
    p.money.monthlyIncome = null;
    const result = generatePlans(p);
    expect(result.conditional.length).toBeGreaterThan(0);
    expect(result.alternatives).toHaveLength(0);
    expect(result.recoveries.length).toBeGreaterThan(0);
    expect(result.conditional[0].finance.householdProjection).toBeNull();
  });

  it("does not invent a commute for remote or job-seeking partners", () => {
    for (const work of ["remote", "seeking"] as const) {
      const p = sampleProfile();
      p.household.partner.work = work;
      const plan = generatePlans(p).alternatives[0];
      expect(plan.journeys.some(j => j.person === "Partner")).toBe(false);
      if (work === "seeking") expect(buildTasks(p, plan).some(task => task.id === "partner-career")).toBe(true);
    }
  });

  it("omits every school cost, journey and task for childless households", () => {
    const p = sampleProfile();
    p.household.composition = "partner";
    const plan = generatePlans(p).alternatives[0];
    expect(plan.schoolId).toBeNull();
    expect(plan.activityId).toBeNull();
    expect(plan.finance.events.some(e => e.id.startsWith("school"))).toBe(false);
    expect(plan.finance.costs.some(c => c.label.includes("School"))).toBe(false);
    expect(plan.journeys.some(j => j.person.startsWith("Child"))).toBe(false);
    expect(buildTasks(p, plan).some(t => t.service === "school")).toBe(false);
  });

  it("keeps hard budget conflicts visible and offers explicit changes to review", () => {
    const p = sampleProfile();
    p.home.annualRentLimit = 100_000;
    const result = generatePlans(p);
    expect(result.alternatives).toHaveLength(0);
    expect(result.recoveries.length).toBeGreaterThan(0);
    expect(result.recoveries[0].edits.some(edit => edit.path === "home.annualRentLimit")).toBe(true);
    expect(result.all.every(plan => plan.requirements.find(r => r.id === "rent")?.status === "not-met")).toBe(true);
  });

  it("honours a required school bus even while a rental car is available", () => {
    const p = sampleProfile();
    p.household.child.schoolBusEssential = true;
    const plan = generatePlans(p).all.find(item => item.homeId === "garden-flat" && item.schoolId === "reed-school")!;
    expect(plan.requirements.find(r => r.id === "school-bus")?.status).toBe("not-met");
    expect(plan.status).toBe("excluded");
  });

  it("keeps an unknown reserve visible and still surfaces recovery options", () => {
    const p = sampleProfile();
    p.money.cash = null;
    const result = generatePlans(p);
    expect(result.alternatives).toHaveLength(0);
    expect(result.recoveries.length).toBeGreaterThan(0);
    expect(result.conditional[0].requirements.find(r => r.id === "reserve")?.status).toBe("unknown");
  });

  it("keeps unsupported workplace anchors unknown rather than silently replacing them", () => {
    const p = sampleProfile();
    p.business.workplaceId = "outside-demo-coverage";
    const result = generatePlans(p);
    expect(result.alternatives).toHaveLength(0);
    expect(result.recoveries.length).toBeGreaterThan(0);
    expect(result.conditional.length).toBeGreaterThan(0);
    expect(result.conditional[0].workplaceId).toBeNull();
    expect(result.conditional[0].requirements.find(r => r.id === "workspace")?.status).toBe("unknown");
  });

  it("scales school fees for more than one child instead of excluding the household", () => {
    const one = sampleProfile();
    one.household.children = 1;
    const two = sampleProfile();
    two.household.children = 2;
    two.household.childAges = [8, 10];
    two.money.cash = 20_000_000;
    two.money.monthlyBudget = 3_000_000;
    two.home.bedrooms = 3;
    const onePlan = generatePlans(one).alternatives[0];
    const twoPlan = generatePlans(two).alternatives[0];
    expect(twoPlan).toBeDefined();
    expect(twoPlan.requirements.find(r => r.id === "child-capacity")?.status).not.toBe("not-met");
    expect(twoPlan.finance.monthlyHousehold).toBeGreaterThan(onePlan.finance.monthlyHousehold);
    expect(twoPlan.finance.costs.some(c => c.label.includes("2 children"))).toBe(true);
  });

  it("retains an earlier selected plan after changing the required workplace", () => {
    const p = sampleProfile();
    const selected = generatePlans(p).alternatives[0];
    p.business.workplaceId = "orchard-works";
    const previous = getPlan(p, selected.id)!;
    expect(previous.id).toBe(selected.id);
    expect(previous.status).toBe("excluded");
    expect(previous.requirements.find(r => r.id === "workspace-anchor")?.status).toBe("not-met");
  });
});
