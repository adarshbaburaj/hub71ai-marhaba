import { describe, expect, it } from "vitest";
import { BANKING_STORAGE_KEY, blankBankingProfile, clearBankingProfile, loadBankingProfile, prepareBankingQuestions, recommendBanking, saveBankingProfile, validateBankingProfile, type BankingStorage } from "./banking";

function memoryStorage(): BankingStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}

describe("isolated banking intake", () => {
  it("lets users omit a score, existing banks and residency", () => {
    const p = blankBankingProfile();
    expect(validateBankingProfile(p).profile).toEqual(p);
    expect(recommendBanking(p)).toHaveLength(3);
    expect(validateBankingProfile({ ...p, scoreStatus: "available", creditScore: null }).profile?.creditScore).toBeNull();
  });

  it("validates the current official 300–850 whole-number range", () => {
    for (const value of [-1, 0, 299, 851, 900, 650.5, Number.NaN, Number.POSITIVE_INFINITY, "650"]) {
      const invalid = validateBankingProfile({ ...blankBankingProfile(), scoreStatus: "available", creditScore: value });
      expect(invalid.profile).toBeNull();
      expect(invalid.errors.creditScore).toBeDefined();
    }
    for (const creditScore of [300, 650, 850]) expect(validateBankingProfile({ ...blankBankingProfile(), scoreStatus: "available", creditScore }).profile?.creditScore).toBe(creditScore);
  });

  it("strips a dormant numeric score after choosing unknown", () => {
    expect(validateBankingProfile({ ...blankBankingProfile(), creditScore: -1 }).profile?.creditScore).toBeNull();
  });

  it("uses explicit account types and feature answers without score eligibility bands", () => {
    const p = { ...blankBankingProfile(), accountType: "business" as const, features: ["startup-funding" as const] };
    const results = recommendBanking(p);
    expect(results[0].id).toBe("founder-demo");
    expect(results.every(bundle => bundle.accountType !== "personal")).toBe(true);
    expect(results.map(bundle => bundle.id)).toEqual(recommendBanking({ ...p, scoreStatus: "available", creditScore: 300 }).map(bundle => bundle.id));
    expect(results.map(bundle => bundle.id)).toEqual(recommendBanking({ ...p, scoreStatus: "available", creditScore: 850, residency: "resident" }).map(bundle => bundle.id));
  });

  it("cannot use hobbies or other relocation answers to score recommendations", () => {
    const first = { ...blankBankingProfile(), features: ["cashback" as const], hobbies: ["Golf"], householdCash: 1_000_000 };
    const second = { ...first, hobbies: ["Running"], householdCash: 0 };
    expect(recommendBanking(first)).toEqual(recommendBanking(second));
    expect(validateBankingProfile(first).profile).not.toHaveProperty("hobbies");
    expect(validateBankingProfile(first).profile).not.toHaveProperty("householdCash");
  });

  it("rejects malformed feature options, account types and oversized bank-name text", () => {
    expect(validateBankingProfile({ ...blankBankingProfile(), features: ["guaranteed-loan"] }).errors.features).toBeDefined();
    expect(validateBankingProfile({ ...blankBankingProfile(), accountType: "credit-approved" }).errors.accountType).toBeDefined();
    expect(validateBankingProfile({ ...blankBankingProfile(), existingBanks: "A".repeat(501) }).errors.existingBanks).toBeDefined();
  });

  it("saves only valid canonical banking data and reloads it independently", () => {
    const storage = memoryStorage();
    const p = { ...blankBankingProfile(), existingBanks: "  My existing bank  ", features: ["savings" as const], hobbies: ["Coffee"] };
    expect(saveBankingProfile(storage, p).saved).toBe(true);
    expect(storage.getItem(BANKING_STORAGE_KEY)).not.toContain("hobbies");
    expect(loadBankingProfile(storage).profile?.existingBanks).toBe("My existing bank");
    expect(loadBankingProfile(storage).profile?.features).toEqual(["savings"]);
    expect(clearBankingProfile(storage).cleared).toBe(true);
    expect(loadBankingProfile(storage).profile).toBeNull();
  });

  it("never reports saved or cleared when browser storage fails", () => {
    const failedStorage: BankingStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(saveBankingProfile(failedStorage, blankBankingProfile()).saved).toBe(false);
    expect(clearBankingProfile(failedStorage).cleared).toBe(false);
    expect(loadBankingProfile(failedStorage).profile).toBeNull();
  });

  it("does not overwrite stored preferences when a score is invalid", () => {
    const storage = memoryStorage();
    saveBankingProfile(storage, blankBankingProfile());
    const before = storage.getItem(BANKING_STORAGE_KEY);
    expect(saveBankingProfile(storage, { ...blankBankingProfile(), scoreStatus: "available", creditScore: -20 }).saved).toBe(false);
    expect(storage.getItem(BANKING_STORAGE_KEY)).toBe(before);
  });

  it("recovers gracefully from malformed or differently versioned stored values", () => {
    const storage = memoryStorage();
    for (const value of ["{broken", "null", '{"version":2,"profile":{}}', '{"version":1,"profile":{"accountType":"approved"}}']) {
      storage.setItem(BANKING_STORAGE_KEY, value);
      expect(loadBankingProfile(storage).profile).toBeNull();
    }
  });

  it("prepares actual banking answers while sharing bank names and the score only when selected", () => {
    const p = { ...blankBankingProfile(), existingBanks: "My Current Bank", scoreStatus: "available" as const, creditScore: 650, features: ["savings" as const, "international-transfer" as const] };
    const bundle = recommendBanking(p)[0];
    const limited = prepareBankingQuestions(p, bundle, { includeExistingBanks: false, includeCreditScore: false });
    expect(limited).toContain("Savings options, International transfers");
    expect(limited).not.toContain("My Current Bank");
    expect(limited).not.toContain("650");
    const shared = prepareBankingQuestions(p, bundle, { includeExistingBanks: true, includeCreditScore: true });
    expect(shared).toContain("Existing bank names supplied: My Current Bank");
    expect(shared).toContain("Optional current Etihad score supplied: 650");
    expect(shared).toContain("does not establish eligibility or approval");
    expect(shared).toContain("No application has been submitted");
  });
});
