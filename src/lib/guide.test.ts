import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyProfileEdits, describeProfileEdit, GUIDE_FALLBACK, isProposalCurrent, parseGuideOutput, profileSchema } from "./guide";
import { blankProfile, sampleProfile } from "./profile";

const { parseResponse, clientOptions } = vi.hoisted(() => ({ parseResponse: vi.fn(), clientOptions: vi.fn() }));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = { parse: parseResponse };
    constructor(options: unknown) { clientOptions(options); }
  },
}));

describe("confirmed guide edits", () => {
  it("accepts a complete blank or example profile", () => {
    expect(profileSchema.safeParse(blankProfile()).success).toBe(true);
    expect(profileSchema.safeParse(sampleProfile()).success).toBe(true);
  });

  it("accepts the form's age range through 21 without falsely confirming school stage", () => {
    const profile = sampleProfile();
    profile.household.child.age = 21;
    expect(profileSchema.safeParse(profile).success).toBe(true);
    expect(() => applyProfileEdits(profile, [{ path: "household.child.age", value: 22 }])).toThrow();
  });

  it("applies a valid atomic edit without mutating previous or retained answers", () => {
    const original = sampleProfile();
    const previous = structuredClone(original);
    const next = applyProfileEdits(original, [
      { path: "household.composition", value: "solo" },
      { path: "money.monthlyBudget", value: 1_800_000 },
    ]);
    expect(original).toEqual(previous);
    expect(next.money.monthlyBudget).toBe(1_800_000);
    expect(next.household.composition).toBe("solo");
    expect(next.household.child).toEqual(previous.household.child);
  });

  it.each(["__proto__.polluted", "constructor.prototype.polluted", "homeId", "schools.0.annualFee", "money.referenceDate"])("rejects unsupported path %s", (path) => {
    expect(() => applyProfileEdits(blankProfile(), [{ path, value: 100 }])).toThrow();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("rejects unknown directory identifiers and repeated paths", () => {
    expect(() => applyProfileEdits(blankProfile(), [{ path: "home.areas", value: ["imaginary-area"] }])).toThrow();
    expect(() => applyProfileEdits(blankProfile(), [{ path: "business.workplaceId", value: "imaginary-place" }])).toThrow();
    expect(() => applyProfileEdits(blankProfile(), [{ path: "home.bedrooms", value: 3 }, { path: "home.bedrooms", value: 2 }])).toThrow();
  });

  it("validates the final full profile and rejects impossible dates or wrong types", () => {
    expect(() => applyProfileEdits(blankProfile(), [{ path: "money.moveDate", value: "2027-02-30" }])).toThrow();
    expect(() => applyProfileEdits(blankProfile(), [{ path: "money.cash", value: -1 }])).toThrow();
    expect(() => applyProfileEdits(blankProfile(), [{ path: "home.bedrooms", value: "three" }])).toThrow();
    expect(() => applyProfileEdits(blankProfile(), [{ path: "household.partner.days", value: 8 }])).toThrow();
  });

  it("parses model proposals into validated local changes", () => {
    const proposal = parseGuideOutput({ explanation: "The budget will be recalculated.", edits: [{ path: "money.monthlyBudget", serializedValue: "1800000" }] }, blankProfile(), 4);
    expect(proposal.edits).toEqual([{ path: "money.monthlyBudget", value: 1_800_000 }]);
    expect(proposal.revision).toBe(4);
    expect(() => parseGuideOutput({ explanation: "Change", edits: [{ path: "home.bedrooms", serializedValue: "{\"bad\":true}" }] }, blankProfile(), 4)).toThrow();
  });

  it("expires proposals on any answer revision and previews human-readable units", () => {
    expect(isProposalCurrent(4, 4)).toBe(true);
    expect(isProposalCurrent(4, 5)).toBe(false);
    expect(isProposalCurrent(-1, -1)).toBe(false);
    const preview = describeProfileEdit(blankProfile(), { path: "money.monthlyBudget", value: 1_800_000 });
    expect(preview.before).toBe("Not answered yet");
    expect(preview.after).toContain("18,000");
    expect(preview.consequence).toContain("recalculated");
  });

  it("validates hobby and routine changes as ordinary confirmed profile edits", () => {
    const next = applyProfileEdits(blankProfile(), [{ path: "lifestyle.hobbies", value: ["Tennis", "Coffee"] }, { path: "lifestyle.routine", value: "Morning exercise before work" }]);
    expect(next.lifestyle).toEqual({ hobbies: ["Tennis", "Coffee"], routine: "Morning exercise before work" });
    expect(() => applyProfileEdits(blankProfile(), [{ path: "lifestyle.hobbies", value: ["Tennis", "Tennis"] }])).toThrow();
  });
});

describe("stateless guide API", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-placeholder");
    parseResponse.mockReset();
    clientOptions.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  async function request(body: unknown = { message: "Explain my plan", profile: blankProfile(), selectedPlanId: null, revision: 1 }, origin = "http://localhost:3000") {
    const { POST } = await import("@/app/api/guide/route");
    return POST(new Request("http://localhost:3000/api/guide", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body),
    }));
  }

  it("returns a useful unavailable response with no key and does not call OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await request();
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe(GUIDE_FALLBACK);
    expect(parseResponse).not.toHaveBeenCalled();
  });

  it("rejects cross-origin, oversized and incomplete input before an upstream call", async () => {
    expect((await request(undefined, "https://other.example")).status).toBe(400);
    expect((await request({ message: "x".repeat(2001), profile: blankProfile(), selectedPlanId: null, revision: 1 })).status).toBe(400);
    expect((await request({ message: "Hello", profile: {}, selectedPlanId: null, revision: 1 })).status).toBe(400);
    expect((await request({ message: "x".repeat(40_000) })).status).toBe(400);
    expect(parseResponse).not.toHaveBeenCalled();
  });

  it("bounds model use and returns a proposal without applying it", async () => {
    parseResponse.mockResolvedValue({ status: "completed", output_parsed: { explanation: "This changes matching homes.", edits: [{ path: "home.bedrooms", serializedValue: "3" }] } });
    const profile = blankProfile();
    const response = await request({ message: "Make that three bedrooms", profile, selectedPlanId: null, revision: 2 });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ edits: [{ path: "home.bedrooms", value: 3 }], revision: 2, available: true });
    expect(profile.home.bedrooms).toBe(2);
    expect(parseResponse.mock.calls[0][0]).toMatchObject({ model: "gpt-6-luna", store: false, max_output_tokens: 1800 });
    expect(parseResponse.mock.calls[0][0].tools).toBeUndefined();
    expect(clientOptions).toHaveBeenCalledWith(expect.objectContaining({ timeout: 25_000, maxRetries: 0 }));
  });

  it("matches the incoming local Host when Next uses its bind address internally", async () => {
    parseResponse.mockResolvedValue({ status: "completed", output_parsed: { explanation: "Your current answers are available.", edits: [] } });
    const { POST } = await import("@/app/api/guide/route");
    const response = await POST(new Request("http://0.0.0.0:3000/api/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json", Host: "localhost:3000", Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin" },
      body: JSON.stringify({ message: "Explain my plan", profile: blankProfile(), selectedPlanId: null, revision: 1 }),
    }));
    expect(response.status).toBe(200);
    expect(parseResponse).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed origins, mismatched local hosts and external host aliases", async () => {
    const { POST } = await import("@/app/api/guide/route");
    for (const [host, origin] of [["localhost:3000", "http://localhost:3000/other"], ["127.0.0.1:3000", "http://localhost:3000"], ["untrusted.example:3000", "http://untrusted.example:3000"]]) {
      const response = await POST(new Request("http://0.0.0.0:3000/api/guide", {
        method: "POST", headers: { "Content-Type": "application/json", Host: host, Origin: origin },
        body: JSON.stringify({ message: "Explain my plan", profile: blankProfile(), selectedPlanId: null, revision: 1 }),
      }));
      expect(response.status).toBe(400);
    }
    expect(parseResponse).not.toHaveBeenCalled();
  });

  it("does not expose upstream errors or invalid directory changes", async () => {
    parseResponse.mockRejectedValueOnce(new Error("Sensitive upstream diagnostics"));
    const failed = await request();
    expect(failed.status).toBe(502);
    expect(JSON.stringify(await failed.json())).not.toContain("Sensitive");
    parseResponse.mockResolvedValueOnce({ status: "completed", output_parsed: { explanation: "Change workplace", edits: [{ path: "business.workplaceId", serializedValue: '"invented-place"' }] } });
    expect((await request()).status).toBe(502);
  });

  it("reports exhausted API credits without returning raw provider diagnostics", async () => {
    parseResponse.mockRejectedValue({ status: 429, code: "credit_balance_exhausted", type: "insufficient_quota", message: "Sensitive provider diagnostics" });
    const response = await request();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("Nori’s API account has no credits available. Add API credits to enable live replies. Answer cards and planning still work.");
    expect(JSON.stringify(body)).not.toContain("Sensitive");
  });

  it("reports a rejected server key without returning the upstream message", async () => {
    parseResponse.mockRejectedValue({ status: 401, message: "Sensitive credential diagnostics" });
    const response = await request();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toContain("API key was rejected");
    expect(JSON.stringify(body)).not.toContain("Sensitive");
  });

  it("rejects a selected plan outside the current deterministic result", async () => {
    const response = await request({ message: "Explain this", profile: blankProfile(), selectedPlanId: "invented-plan", revision: 1 });
    expect(response.status).toBe(400);
    expect(parseResponse).not.toHaveBeenCalled();
  });

  it("keeps Nori usable when a saved family combination becomes dormant after a solo edit", async () => {
    const profile = sampleProfile();
    profile.household.composition = "solo";
    parseResponse.mockResolvedValue({ status: "completed", output_parsed: { explanation: "The earlier family combination needs review; school costs are not counted for your solo move.", edits: [] } });
    const response = await request({ message: "Explain my current move", profile, selectedPlanId: "reed-apartment::reed-school::harbor-lab", revision: 3 });
    expect(response.status).toBe(200);
    const context = JSON.parse(parseResponse.mock.calls[0][0].input[0].content.split(": ").slice(1).join(": "));
    expect(context.selectedPlan).toBeNull();
    expect(context.selectedPlanNeedsReview).toBe(true);
    expect(context.effectiveProfile.household.children).toBe(0);
    expect(context.planning.plans.every((plan: { schoolId: string | null }) => plan.schoolId === null)).toBe(true);
  });

  it("rejects extra identifier segments rather than reconstructing a different combination", async () => {
    const response = await request({ message: "Explain this", profile: sampleProfile(), selectedPlanId: "reed-apartment::reed-school::harbor-lab::extra", revision: 3 });
    expect(response.status).toBe(400);
    expect(parseResponse).not.toHaveBeenCalled();
  });

  it("caps concurrent local-preview calls and releases the slots when they finish", async () => {
    let release!: (value: unknown) => void;
    parseResponse.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const first = request();
    const second = request();
    await vi.waitFor(() => expect(parseResponse).toHaveBeenCalledTimes(2));
    const third = await request();
    expect(third.status).toBe(503);
    expect((await third.json()).error).toContain("Nori is busy");
    release({ status: "completed", output_parsed: { explanation: "Please complete your answers.", edits: [] } });
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
    parseResponse.mockResolvedValue({ status: "completed", output_parsed: { explanation: "Your cards still work.", edits: [] } });
    expect((await request()).status).toBe(200);
  });
});
