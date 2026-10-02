import { describe, expect, it } from "vitest";
import { areas, homes, schools, workplaces } from "./data";
import { buildTasks, generatePlans, getPlan } from "./planner";
import { blankProfile, effectiveProfile, hasChild, hasPartner, sampleProfile } from "./profile";

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

describe("connected plans", () => {
  it("contains the bounded fictional dataset and sample anchors", () => {
    expect(areas).toHaveLength(4);
    expect(homes).toHaveLength(8);
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

  it("supports a partial first pass but marks missing school details unknown", () => {
    const p = sampleProfile();
    p.household.child.age = null;
    p.household.child.curriculum = null;
    p.money.reserve = 0;
    p.money.cash = null;
    p.money.monthlyIncome = null;
    expect(generatePlans(p).conditional.length).toBeGreaterThan(0);
    expect(generatePlans(p).alternatives).toHaveLength(0);
    expect(generatePlans(p).conditional[0].finance.householdProjection).toBeNull();
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

  it("returns no matches with actual conflicts rather than relaxing a hard budget", () => {
    const p = sampleProfile();
    p.home.annualRentLimit = 100_000;
    const result = generatePlans(p);
    expect(result.alternatives).toHaveLength(0);
    expect(result.conditional).toHaveLength(0);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.all.every(plan => plan.requirements.find(r => r.id === "rent")?.status === "not-met")).toBe(true);
  });

  it("honours a required school bus even while a rental car is available", () => {
    const p = sampleProfile();
    p.household.child.schoolBusEssential = true;
    const plan = generatePlans(p).all.find(item => item.homeId === "garden-flat" && item.schoolId === "reed-school")!;
    expect(plan.requirements.find(r => r.id === "school-bus")?.status).toBe("not-met");
    expect(plan.status).toBe("excluded");
  });

  it("keeps an essential unknown reserve visible and does not manufacture cash", () => {
    const p = sampleProfile();
    p.money.cash = null;
    const result = generatePlans(p);
    expect(result.alternatives).toHaveLength(0);
    expect(result.conditional[0].requirements.find(r => r.id === "reserve")?.status).toBe("unknown");
  });

  it("keeps unsupported workplace anchors unknown rather than silently replacing them", () => {
    const p = sampleProfile();
    p.business.workplaceId = "outside-demo-coverage";
    const result = generatePlans(p);
    expect(result.alternatives).toHaveLength(0);
    expect(result.conditional.length).toBeGreaterThan(0);
    expect(result.conditional[0].workplaceId).toBeNull();
    expect(result.conditional[0].requirements.find(r => r.id === "workspace")?.status).toBe("unknown");
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
