import { describe, expect, it } from "vitest";
import { blankProfile, effectiveProfile, sampleProfile } from "@/lib/profile";
import { profileSchema } from "@/lib/guide";
import { adjacentQuestion, applyQuestionAnswer, questionDefinitions, questionsForNode, questionsForProfile, readQuestionAnswer } from "@/lib/questions";

const question = (id: string) => {
  const match = questionDefinitions.find((item) => item.id === id);
  if (!match) throw new Error(`Missing question ${id}`);
  return match;
};
const ids = (profile = blankProfile()) => questionsForProfile(profile).map((item) => item.id);

describe("single-question onboarding", () => {
  it("provides distinct question IDs and readable profile fields for each microstep", () => {
    expect(new Set(questionDefinitions.map((item) => item.id)).size).toBe(questionDefinitions.length);
    for (const item of questionDefinitions) expect(readQuestionAnswer(blankProfile(), item)).not.toBeUndefined();
  });

  it("starts each chosen business path with its field rather than asking the entry choice again", () => {
    for (const intent of ["move", "start"] as const) {
      const profile = { ...blankProfile(), intent };
      expect(questionsForNode(profile, "business").map((item) => item.id)).toEqual(["business-field", "business-description", "business-team"]);
    }
    expect(ids()).toContain("business-path");
    expect(ids({ ...blankProfile(), intent: "explore" })).toContain("business-path");
  });

  it("skips workplace location and company cash questions when they do not apply", () => {
    const profile = blankProfile();
    profile.intent = "start";
    profile.business.workspace = "remote";
    expect(ids(profile)).not.toContain("workspace-anchor");
    expect(ids(profile)).not.toContain("business-cash");
    expect(adjacentQuestion(profile, "workspace-type", 1)?.id).toBe("business-finance-toggle");
    expect(adjacentQuestion(profile, "business-finance-toggle", 1)?.id).toBe("household-composition");
    profile.business.includeFinances = true;
    expect(adjacentQuestion(profile, "business-finance-toggle", 1)?.id).toBe("business-cash");
  });

  it("reveals only the partner work questions relevant to the household", () => {
    const profile = sampleProfile();
    profile.household.composition = "solo";
    expect(ids(profile).filter((id) => id.startsWith("partner-") || id.startsWith("child-"))).toEqual([]);
    profile.household.composition = "partner";
    profile.household.partner.work = "remote";
    expect(ids(profile).filter((id) => id.startsWith("partner-"))).toEqual(["partner-work"]);
    expect(adjacentQuestion(profile, "partner-work", 1)?.id).toBe("lifestyle-hobbies");
    profile.household.partner.work = "hybrid";
    expect(ids(profile).filter((id) => id.startsWith("partner-"))).toEqual(["partner-work", "partner-anchor", "partner-days"]);
  });

  it("grows child questions only for a family and keeps school bus separate from car access", () => {
    const profile = sampleProfile();
    expect(questionsForNode(profile, "household").map((item) => item.id)).toContain("child-count");
    expect(questionsForNode(profile, "child").map((item) => item.id)).toEqual(["child-age", "child-curriculum", "child-swimming", "child-bus"]);
    const schoolBus = applyQuestionAnswer(profile, question("child-bus"), true);
    expect(schoolBus.household.child.schoolBusEssential).toBe(true);
    expect(schoolBus.transport.car).toBe(profile.transport.car);
  });

  it("asks a lean core spine after welcome defaults", () => {
    const profile = blankProfile();
    profile.intent = "start";
    profile.business.workspace = "desk";
    profile.business.workplaceId = "harbor-lab";
    expect(questionsForProfile(profile, { coreOnly: true }).map((item) => item.id)).toEqual([
      "business-field", "household-composition", "home-areas", "transport-car", "money-budget", "priorities-order",
    ]);
    profile.household.composition = "family";
    profile.household.children = 2;
    expect(questionsForProfile(profile, { coreOnly: true }).map((item) => item.id)).toEqual([
      "business-field", "household-composition", "child-age", "child-curriculum", "home-areas", "transport-car", "money-budget", "priorities-order",
    ]);
  });

  it("preserves dormant child answers while excluding them from effective circumstances", () => {
    const original = sampleProfile();
    const solo = applyQuestionAnswer(original, question("household-composition"), "solo");
    expect(original.household.composition).toBe("family");
    expect(solo.household.child).toEqual(original.household.child);
    expect(effectiveProfile(solo).household.children).toBe(0);
    expect(questionsForNode(solo, "child")).toEqual([]);
    const restored = applyQuestionAnswer(solo, question("household-composition"), "family");
    expect(restored.household.child).toEqual(original.household.child);
    expect(questionsForNode(restored, "child")).toHaveLength(4);
    expect(questionsForNode(restored, "household").some((item) => item.id === "child-count")).toBe(true);
  });

  it("retains hidden sibling ages when a smaller household edits its visible age", () => {
    let profile = sampleProfile();
    profile.household.children = 3;
    profile.household.childAges = [7, 10, 14];
    profile = applyQuestionAnswer(profile, question("child-count"), 1);
    profile = applyQuestionAnswer(profile, question("child-age"), [8]);
    profile = applyQuestionAnswer(profile, question("child-count"), 3);
    expect(readQuestionAnswer(profile, question("child-age"))).toEqual([8, 10, 14]);
    profile = applyQuestionAnswer(profile, question("household-composition"), "single-parent");
    expect(questionsForProfile(profile).some(item => item.id.startsWith("partner-"))).toBe(false);
    expect(profileSchema.safeParse(profile).success).toBe(true);
  });

  it("confirms child count with ages while retaining removed siblings and unknown new ages", () => {
    let profile = sampleProfile();
    profile.household.children = 3;
    profile.household.childAges = [7, 10, 14];
    const original = structuredClone(profile);
    profile = applyQuestionAnswer(profile, question("child-age"), [8]);
    expect(original.household.children).toBe(3);
    expect(profile.household.children).toBe(1);
    expect(profile.household.childAges).toEqual([8, 10, 14]);
    profile = applyQuestionAnswer(profile, question("child-age"), [8, 10, 14, null]);
    expect(profile.household.children).toBe(4);
    expect(readQuestionAnswer(profile, question("child-age"))).toEqual([8, 10, 14, null]);
    expect(profileSchema.safeParse(profile).success).toBe(true);
  });

  it("recovers forward navigation when a dependent question has become irrelevant", () => {
    const profile = sampleProfile();
    profile.household.partner.work = "remote";
    expect(adjacentQuestion(profile, "partner-anchor", 1)?.id).toBe("child-age");
    profile.household.composition = "solo";
    expect(adjacentQuestion(profile, "child-curriculum", 1)?.id).toBe("lifestyle-hobbies");
    expect(adjacentQuestion(profile, "child-curriculum", -1)?.id).toBe("household-composition");
  });

  it("asks for a planning reference only when arrival is undecided", () => {
    const profile = blankProfile();
    expect(adjacentQuestion(profile, "money-arrival", 1)?.id).toBe("money-reference");
    profile.money.moveDate = "2026-12-15";
    expect(ids(profile)).not.toContain("money-reference");
    expect(adjacentQuestion(profile, "money-arrival", 1)?.id).toBe("priorities-order");
  });

  it("preserves priority order and nullable locations in a schema-valid confirmed profile", () => {
    let profile = sampleProfile();
    profile = applyQuestionAnswer(profile, question("priorities-order"), ["travel", "cash", "family"]);
    profile = applyQuestionAnswer(profile, question("workspace-anchor"), "");
    expect(profile.money.priorities).toEqual(["travel", "cash", "family"]);
    expect(profile.business.workplaceId).toBeNull();
    expect(profileSchema.safeParse(profile).success).toBe(true);
  });
});
