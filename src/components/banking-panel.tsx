"use client";

import { useEffect, useState, type JSX } from "react";
import { ArrowRight, Copy, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BANKING_SOURCES, CREDIT_SCORE_RANGE, bankingFeatures, blankBankingProfile, clearBankingProfile, loadBankingProfile, prepareBankingQuestions, recommendBanking, saveBankingProfile, validateBankingProfile, type BankingBundle, type BankingErrors, type BankingProfile } from "@/lib/banking";
import { cn } from "@/lib/utils";

/** Optional Money-page addition: no relocation profile, props or engine dependency. */
export function BankingPanel(): JSX.Element {
  const [draft, setDraft] = useState<BankingProfile>(blankBankingProfile);
  const [scoreText, setScoreText] = useState("");
  const [committed, setCommitted] = useState<BankingProfile | null>(null);
  const [errors, setErrors] = useState<BankingErrors>({});
  const [message, setMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [includeExistingBanks, setIncludeExistingBanks] = useState(false);
  const [includeCreditScore, setIncludeCreditScore] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const loaded = loadBankingProfile(window.localStorage);
        if (loaded.profile) {
          setDraft(loaded.profile);
          setCommitted(loaded.profile);
          setScoreText(loaded.profile.creditScore === null ? "" : String(loaded.profile.creditScore));
        }
        setMessage(loaded.message);
      } catch {
        setMessage("Device storage is unavailable. You can still explore the demo concepts.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const results = committed ? recommendBanking(committed) : [];
  const change = (patch: Partial<BankingProfile>): void => {
    setDraft(current => ({ ...current, ...patch }));
    setDirty(true);
    setErrors({});
    setMessage("Banking changes have not been applied yet.");
  };

  const prepare = (): void => {
    const validation = validateBankingProfile({ ...draft, creditScore: draft.scoreStatus === "available" && scoreText.trim() ? Number(scoreText) : null });
    setErrors(validation.errors);
    if (!validation.profile) {
      setMessage("Check the banking answers below.");
      return;
    }
    setDraft(validation.profile);
    setCommitted(validation.profile);
    setScoreText(validation.profile.creditScore === null ? "" : String(validation.profile.creditScore));
    setDirty(false);
    try {
      setMessage(saveBankingProfile(window.localStorage, validation.profile).message);
    } catch {
      setMessage("Device storage is unavailable. These banking results are available for this visit.");
    }
  };

  const clear = (): void => {
    try {
      const result = clearBankingProfile(window.localStorage);
      setMessage(result.message);
      if (!result.cleared) return;
      setDraft(blankBankingProfile());
      setCommitted(null);
      setScoreText("");
      setErrors({});
      setDirty(false);
      setCopyStatus("");
      setIncludeExistingBanks(false);
      setIncludeCreditScore(false);
    } catch {
      setMessage("Device storage could not be cleared. Saved banking preferences may remain on this device.");
    }
  };

  const copyQuestions = async (bundle: BankingBundle): Promise<void> => {
    if (!committed) return;
    try {
      await navigator.clipboard.writeText(prepareBankingQuestions(committed, bundle, { includeExistingBanks, includeCreditScore }));
      setCopyStatus(`Questions copied for ${bundle.title.toLowerCase()}.`);
    } catch {
      setCopyStatus("Copy is unavailable. Select and copy the visible questions instead.");
    }
  };

  return <section className="plan-detail" aria-labelledby="banking-heading">
    <div className="section-heading"><div><span className="eyebrow">BANKING · OPTIONAL</span><h2 id="banking-heading">Prepare your banking shortlist.</h2></div><span className="outline-badge">DEMONSTRATION CONCEPTS</span></div>
    <p className="inline-note">Nori can organise account questions around your banking preferences. These are synthetic bundles, with no real offer, quote or approval. They do not change your relocation costs or cash projection.</p>
    <details style={{ marginTop: 20 }} open={!!committed || undefined}>
      <summary className="text-link" style={{ cursor: "pointer", minHeight: 40 }}><Landmark size={15} aria-hidden="true" />Tell Nori what you need from banking</summary>
      <form noValidate onSubmit={event => { event.preventDefault(); prepare(); }}>
        <div className="question-body">
          <div className="field-grid">
            <div className="field"><label className="field-label" htmlFor="banking-existing">Banks you already use <span className="field-optional">Optional</span></label><input id="banking-existing" maxLength={500} value={draft.existingBanks} placeholder="Names only, for example your current bank" onChange={event => change({ existingBanks: event.target.value })} aria-invalid={!!errors.existingBanks} aria-describedby="banking-existing-help" /><p id="banking-existing-help" className="field-help">Add bank names without account numbers or documents.</p>{errors.existingBanks && <p className="inline-note" role="alert">{errors.existingBanks}</p>}</div>
            <div className="field"><label className="field-label" htmlFor="banking-residency">Residency status <span className="field-optional">Optional</span></label><select id="banking-residency" value={draft.residency} onChange={event => change({ residency: event.target.value as BankingProfile["residency"] })}><option value="unknown">Not sure or prefer not to share</option><option value="resident">Already a UAE resident</option><option value="planning">Planning to become a UAE resident</option></select><p className="field-help">Ask each bank about its documentation requirements. This answer does not establish eligibility.</p></div>
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}><legend className="field-label">Which accounts would you like to explore?</legend><div className="choice-grid">{([['personal', 'Personal'], ['business', 'Business'], ['both', 'Personal and business']] as const).map(([value, label]) => <button key={value} type="button" className={cn("choice-button", draft.accountType === value && "is-selected")} aria-pressed={draft.accountType === value} onClick={() => change({ accountType: value })}><span className="choice-title">{label}</span><span className="choice-indicator" aria-hidden="true" /></button>)}</div>{errors.accountType && <p className="inline-note" role="alert">{errors.accountType}</p>}</fieldset>
          <div className="field-grid">
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}><legend className="field-label">Do you have a current Etihad Credit Bureau score? <span className="field-optional">Optional</span></legend><div className="choice-grid">{([['unknown', 'Unknown or not shared'], ['available', 'I have a score']] as const).map(([value, label]) => <button key={value} type="button" className={cn("choice-button", draft.scoreStatus === value && "is-selected")} aria-pressed={draft.scoreStatus === value} onClick={() => change({ scoreStatus: value })}><span className="choice-title">{label}</span><span className="choice-indicator" aria-hidden="true" /></button>)}</div><p className="field-help">The score does not rank these concepts or imply access to credit.</p></fieldset>
            {draft.scoreStatus === "available" && <div className="field"><label className="field-label" htmlFor="banking-score">Current report score <span className="field-optional">Optional</span></label><input id="banking-score" type="number" inputMode="numeric" step={1} min={CREDIT_SCORE_RANGE.min} max={CREDIT_SCORE_RANGE.max} value={scoreText} placeholder="Leave blank if you prefer" onChange={event => { setScoreText(event.target.value); setDirty(true); setErrors({}); setMessage("Banking changes have not been applied yet."); }} aria-invalid={!!errors.creditScore} aria-describedby="banking-score-help" /><p className="field-help" id="banking-score-help">Current Credit Score 3i range: 300–850. Use the number on your current report; no report upload is needed.</p>{errors.creditScore && <p className="inline-note" role="alert">{errors.creditScore}</p>}</div>}
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}><legend className="field-label">What would you like to compare? <span className="field-optional">Optional</span></legend><div className="choice-grid">{bankingFeatures.map(feature => <label key={feature.id} className="checkbox-row"><input type="checkbox" checked={draft.features.includes(feature.id)} onChange={event => change({ features: event.target.checked ? [...draft.features, feature.id] : draft.features.filter(value => value !== feature.id) })} />{feature.label}</label>)}</div><p className="field-help">These preferences organise questions. Cashback, savings terms and funding availability still require a real provider&apos;s confirmation.</p></fieldset>
          <div className="button-row"><Button type="submit">Prepare demo comparison <ArrowRight size={14} aria-hidden="true" /></Button><Button type="button" variant="ghost" onClick={clear}>Clear banking preferences</Button></div>
          {message && <p className="field-help" role="status" aria-live="polite">{message}</p>}
        </div>
      </form>
    </details>
    {!!results.length && <div style={{ marginTop: 20 }}>
      <div className="section-heading"><h3 style={{ fontSize: 16 }}>Your demo account concepts</h3><span className="muted">{dirty ? "Previous comparison. Apply your changes to update." : "Ordered by account type and selected features."}</span></div>
      <p className="field-help" style={{ marginBottom: 14 }}>Your prepared context: {committed!.existingBanks ? `existing banks ${committed!.existingBanks}; ` : "existing banks not supplied; "}{committed!.creditScore !== null ? `optional supplied score ${committed!.creditScore}; ` : "score not supplied; "}{committed!.features.length ? `topics ${committed!.features.map(feature => bankingFeatures.find(item => item.id === feature)!.label.toLowerCase()).join(", ")}.` : "no preferred features set."} The score remains separate from ordering and eligibility.</p>
      <div className="field-grid" style={{ marginBottom: 20 }}>
        {committed!.existingBanks && <label className="checkbox-row"><input type="checkbox" checked={includeExistingBanks} onChange={event => setIncludeExistingBanks(event.target.checked)} />Include my existing bank names in copied questions</label>}
        {committed!.creditScore !== null && <label className="checkbox-row"><input type="checkbox" checked={includeCreditScore} onChange={event => setIncludeCreditScore(event.target.checked)} />Include my supplied score in copied questions</label>}
      </div>
      <div className="plan-comparison">{results.map(bundle => <article className="plan-column" key={bundle.id}>
        <div className="plan-column-head"><span className="eyebrow">SYNTHETIC BUNDLE</span><h3 className="question-title">{bundle.title}</h3><p>{bundle.summary}</p></div>
        <div className="plan-row"><span>Why this concept appears</span>{bundle.rationale.map(reason => <p className="field-help" key={reason}>{reason}</p>)}</div>
        <div className="plan-tradeoff"><span className="eyebrow">QUESTIONS TO ASK A BANK</span><ul style={{ paddingLeft: 17, fontSize: 11, lineHeight: 1.8 }}>{bundle.questions.map(question => <li key={question}>{question}</li>)}</ul></div>
        <details className="field-help" style={{ marginBottom: 16 }}><summary style={{ cursor: "pointer" }}>Preview copied context and questions</summary><pre tabIndex={0} style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.8 }}>{prepareBankingQuestions(committed!, bundle, { includeExistingBanks, includeCreditScore })}</pre></details>
        <div className="plan-actions"><Button type="button" variant="outline" size="sm" onClick={() => void copyQuestions(bundle)}><Copy size={13} aria-hidden="true" />Copy bank questions</Button></div>
      </article>)}</div>
      {copyStatus && <p className="field-help" role="status" aria-live="polite" style={{ marginTop: 12 }}>{copyStatus}</p>}
    </div>}
    <footer style={{ marginTop: 20 }}><p className="field-help">Etihad Credit Bureau provides the current score information. Banks conduct their own application and affordability assessments; Marhaba does not determine credit eligibility.</p><div className="button-row" style={{ marginTop: 8 }}>{BANKING_SOURCES.map(source => <a className="text-link" key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} <ArrowRight size={12} aria-hidden="true" /></a>)}</div></footer>
  </section>;
}
