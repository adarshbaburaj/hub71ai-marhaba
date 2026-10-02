/** Banking intake is deliberately separate from the relocation cash engine. */
export type BankingFeature = "low-fees" | "cashback" | "savings" | "international-transfer" | "business" | "startup-funding";
export type AccountType = "personal" | "business" | "both";
export interface BankingProfile {
  existingBanks: string;
  accountType: AccountType;
  scoreStatus: "unknown" | "available";
  creditScore: number | null;
  features: BankingFeature[];
  residency: "unknown" | "resident" | "planning";
}
export interface BankingBundle {
  id: string;
  title: string;
  accountType: AccountType;
  summary: string;
  features: BankingFeature[];
  rationale: string[];
  questions: string[];
}
export type BankingErrors = Partial<Record<keyof BankingProfile, string>>;
export interface BankingValidation { profile: BankingProfile | null; errors: BankingErrors }
export interface BankingStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const BANKING_STORAGE_KEY = "marhaba.banking.v1";
export const CREDIT_SCORE_RANGE = { min: 300, max: 850 } as const;
export const BANKING_SOURCES = [
  { title: "Etihad Credit Bureau: Credit Score 3i", url: "https://etihadbureau.ae/Individual/CreditScore" },
  { title: "CBUAE: Responsible Financing Practice", url: "https://rulebook.centralbank.ae/en/rulebook/article-7-responsible-financing-practice-1" },
] as const;
export const bankingFeatures: { id: BankingFeature; label: string }[] = [
  { id: "low-fees", label: "Lower fees" },
  { id: "cashback", label: "Cashback to investigate" },
  { id: "savings", label: "Savings options" },
  { id: "international-transfer", label: "International transfers" },
  { id: "business", label: "Business banking" },
  { id: "startup-funding", label: "Startup funding questions" },
];

export function blankBankingProfile(): BankingProfile {
  return { existingBanks: "", accountType: "personal", scoreStatus: "unknown", creditScore: null, features: [], residency: "unknown" };
}

/** Pick only banking answers; unrelated lifestyle or relocation fields cannot enter results. */
export function validateBankingProfile(value: unknown): BankingValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { profile: null, errors: { accountType: "Choose the account type you want to explore." } };
  const raw = value as Record<string, unknown>;
  const errors: BankingErrors = {};
  const existingBanks = typeof raw.existingBanks === "string" ? raw.existingBanks.trim() : "";
  if (existingBanks.length > 500) errors.existingBanks = "Keep existing bank names within 500 characters.";
  if (raw.accountType !== "personal" && raw.accountType !== "business" && raw.accountType !== "both") errors.accountType = "Choose personal, business, or both.";
  if (raw.scoreStatus !== "unknown" && raw.scoreStatus !== "available") errors.scoreStatus = "Choose whether you have a score to share.";
  let creditScore: number | null = null;
  if (raw.scoreStatus === "available" && raw.creditScore !== null && raw.creditScore !== undefined) {
    if (typeof raw.creditScore !== "number" || !Number.isFinite(raw.creditScore) || !Number.isInteger(raw.creditScore) || raw.creditScore < CREDIT_SCORE_RANGE.min || raw.creditScore > CREDIT_SCORE_RANGE.max) errors.creditScore = "Enter a whole-number current Etihad score between 300 and 850, or leave it blank.";
    else creditScore = raw.creditScore;
  }
  const allowed = new Set(bankingFeatures.map(feature => feature.id));
  const features = Array.isArray(raw.features) ? [...new Set(raw.features)] : [];
  if (!Array.isArray(raw.features) || features.some(feature => typeof feature !== "string" || !allowed.has(feature as BankingFeature))) errors.features = "Choose from the listed banking features.";
  if (raw.residency !== "unknown" && raw.residency !== "resident" && raw.residency !== "planning") errors.residency = "Choose a residency answer, or leave it unknown.";
  if (Object.keys(errors).length) return { profile: null, errors };
  return { profile: { existingBanks, accountType: raw.accountType as AccountType, scoreStatus: raw.scoreStatus as BankingProfile["scoreStatus"], creditScore, features: features as BankingFeature[], residency: raw.residency as BankingProfile["residency"] }, errors: {} };
}

const demoBundles: Omit<BankingBundle, "rationale">[] = [
  { id: "everyday-demo", title: "Everyday account concept", accountType: "personal", summary: "A fictional account bundle for daily payments and organising savings questions.", features: ["low-fees", "savings"], questions: ["What are the minimum balance, monthly fees and conditions for any fee waiver?", "What are the savings terms, access restrictions and charges?", "Which residency and identity documents are required by this bank?"] },
  { id: "rewards-demo", title: "Rewards account concept", accountType: "personal", summary: "A fictional bundle for comparing cashback terms and everyday banking costs.", features: ["cashback", "low-fees"], questions: ["Which spending categories qualify, and what caps or exclusions apply?", "Is cashback conditional on a credit product, salary transfer or annual fee?", "Can the account be opened without additional bundled products?"] },
  { id: "global-demo", title: "International account concept", accountType: "both", summary: "A fictional bundle for organising personal or business cross-border payment questions.", features: ["international-transfer", "low-fees", "savings"], questions: ["What are the transfer charges, exchange-rate margins and correspondent-bank costs?", "Which currencies, destination countries and transfer limits are supported?", "Does the account serve personal transactions, business transactions, or both?"] },
  { id: "business-demo", title: "Business essentials concept", accountType: "business", summary: "A fictional bundle for company payments and business-account preparation.", features: ["business", "low-fees", "international-transfer"], questions: ["Which company, ownership and activity documents are required?", "What are the opening deposit, minimum balance, transaction and monthly charges?", "Can the bank support the company's expected payments and international customers?"] },
  { id: "founder-demo", title: "Founder preparation concept", accountType: "business", summary: "A fictional bundle for separating company money and preparing startup-funding questions.", features: ["business", "startup-funding", "international-transfer"], questions: ["Which funding products or introductions can be investigated, and what terms apply?", "What financial history, security, affordability review or company documentation may be required?", "Which application costs are payable even if funding is not approved?"] },
];

/** Scores and residency never determine eligibility, rank, limits, rates or terms. */
export function recommendBanking(profile: BankingProfile): BankingBundle[] {
  const result = validateBankingProfile(profile);
  if (!result.profile) return [];
  const p = result.profile;
  const suitable = demoBundles.filter(bundle => p.accountType === "both" || bundle.accountType === "both" || bundle.accountType === p.accountType);
  const matches = (bundle: Omit<BankingBundle, "rationale">): number => bundle.features.filter(feature => p.features.includes(feature)).length;
  return [...suitable].sort((a, b) => matches(b) - matches(a) || a.id.localeCompare(b.id)).slice(0, 3).map(bundle => {
    const selected = bundle.features.filter(feature => p.features.includes(feature)).map(feature => bankingFeatures.find(item => item.id === feature)!.label.toLowerCase());
    return { ...bundle, rationale: [
      `You want to explore ${p.accountType === "both" ? "personal and business" : p.accountType} banking.`,
      selected.length ? `Your selected topics include ${selected.join(", ")}.` : "No feature preference is set; use this concept to prepare comparison questions.",
      ...(p.existingBanks ? ["You named an existing bank; compare its documented terms alongside any new account."] : []),
    ] };
  });
}

/** A local handoff preview; the person chooses whether to include financial context. */
export function prepareBankingQuestions(profile: BankingProfile, bundle: BankingBundle, sharing: { includeExistingBanks: boolean; includeCreditScore: boolean }): string {
  const valid = validateBankingProfile(profile);
  if (!valid.profile) return "";
  const p = valid.profile;
  const features = p.features.map(feature => bankingFeatures.find(item => item.id === feature)!.label);
  const context = [
    `Account interest: ${p.accountType === "both" ? "personal and business" : p.accountType}.`,
    `Features to investigate: ${features.join(", ") || "not specified"}.`,
    `Residency status supplied: ${p.residency === "resident" ? "already a UAE resident" : p.residency === "planning" ? "planning UAE residency" : "unknown or not shared"}.`,
    ...(sharing.includeExistingBanks && p.existingBanks ? [`Existing bank names supplied: ${p.existingBanks}.`] : []),
    ...(sharing.includeCreditScore && p.creditScore !== null ? [`Optional current Etihad score supplied: ${p.creditScore}. Please explain which additional information and checks you require; this number does not establish eligibility or approval.`] : []),
  ];
  return `Marhaba banking questions\n${bundle.title} · synthetic demonstration concept\n\n${context.join("\n")}\n\n${bundle.questions.map(question => `- ${question}`).join("\n")}\n\nPlease confirm actual product terms, eligibility, fees and availability. No application has been submitted.`;
}

export function saveBankingProfile(storage: BankingStorage, profile: BankingProfile): { saved: boolean; message: string } {
  const valid = validateBankingProfile(profile);
  if (!valid.profile) return { saved: false, message: "Check the banking answers before saving." };
  try {
    storage.setItem(BANKING_STORAGE_KEY, JSON.stringify({ version: 1, profile: valid.profile }));
    return { saved: true, message: "Banking preferences saved on this device." };
  } catch {
    return { saved: false, message: "Device storage is unavailable. These banking results are available for this visit." };
  }
}

export function loadBankingProfile(storage: BankingStorage): { profile: BankingProfile | null; message: string } {
  try {
    const text = storage.getItem(BANKING_STORAGE_KEY);
    if (!text) return { profile: null, message: "" };
    const stored = JSON.parse(text) as { version?: unknown; profile?: unknown };
    const valid = stored?.version === 1 ? validateBankingProfile(stored.profile) : { profile: null };
    return valid.profile ? { profile: valid.profile, message: "Saved banking preferences loaded from this device." } : { profile: null, message: "Saved banking preferences could not be read. Start a fresh comparison." };
  } catch {
    return { profile: null, message: "Device storage is unavailable. You can still explore the demo concepts." };
  }
}

export function clearBankingProfile(storage: BankingStorage): { cleared: boolean; message: string } {
  try {
    storage.removeItem(BANKING_STORAGE_KEY);
    return { cleared: true, message: "Banking preferences cleared from this device." };
  } catch {
    return { cleared: false, message: "Device storage could not be cleared. The saved banking preferences may remain on this device." };
  }
}
