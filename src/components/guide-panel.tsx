"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Check, LoaderCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { NoriBlob } from "@/components/nori-blob";
import { Button } from "@/components/ui/button";
import { applyProfileEdits, describeProfileEdit, GUIDE_FALLBACK, guideProposalSchema, isProposalCurrent } from "@/lib/guide";
import type { GuideProposal, MoveProfile } from "@/lib/types";

interface GuidePanelProps {
  profile: MoveProfile;
  revision: number;
  selectedPlanId: string | null;
  onApply: (profile: MoveProfile) => void;
  open: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
  restoreQuestionFocusRef?: RefObject<boolean>;
}

interface Message { id: number; role: "user" | "guide"; text: string }

export function GuidePanel({ profile, revision, selectedPlanId, onApply, open, onClose, returnFocusRef, restoreQuestionFocusRef }: GuidePanelProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposal, setProposal] = useState<GuideProposal | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [availability, setAvailability] = useState<"unknown" | "live" | "unavailable">("unknown");
  const abortRef = useRef<AbortController | null>(null);
  const revisionRef = useRef(revision);
  const idRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
    }
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, pending, proposal, error, notice]);

  function addMessage(role: Message["role"], text: string) {
    const id = ++idRef.current;
    setMessages((previous) => [...previous.slice(-19), { id, role, text }]);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || text.length > 2000 || pending) return;
    const requestRevision = revision;
    const requestProfile = structuredClone(profile);
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    setNotice(null);
    setProposal(null);
    setMessage("");
    addMessage("user", text);
    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, profile: requestProfile, selectedPlanId, revision: requestRevision }),
        signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setAvailability(response.status === 503 || response.status === 502 ? "unavailable" : "unknown");
        const serverMessage = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : GUIDE_FALLBACK;
        setError(serverMessage);
        return;
      }
      const parsed = guideProposalSchema.safeParse(payload && typeof payload === "object" ? {
        explanation: "explanation" in payload ? payload.explanation : undefined,
        edits: "edits" in payload ? payload.edits : undefined,
        revision: "revision" in payload ? payload.revision : undefined,
      } : payload);
      if (!parsed.success || parsed.data.revision !== requestRevision) throw new Error("Invalid guide reply.");
      applyProfileEdits(requestProfile, parsed.data.edits);
      setAvailability("live");
      if (!isProposalCurrent(requestRevision, revisionRef.current)) {
        setNotice("Your answers changed while the guide was thinking. Ask again using your current plan.");
        return;
      }
      addMessage("guide", parsed.data.explanation);
      if (parsed.data.edits.length) setProposal(parsed.data);
    } catch {
      if (!controller.signal.aborted) {
        setAvailability("unavailable");
        setError(GUIDE_FALLBACK);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(false);
      }
    }
  }

  function apply() {
    if (!proposal) return;
    if (!isProposalCurrent(proposal.revision, revision)) {
      setProposal(null);
      setNotice("This suggestion has expired because your answers changed. Ask again for a current suggestion.");
      return;
    }
    try {
      const next = applyProfileEdits(profile, proposal.edits);
      setProposal(null);
      setNotice("Changes applied. Your related choices and plan calculations are being refreshed.");
      onApply(next);
    } catch {
      setProposal(null);
      setError("That suggestion could not be applied. Please change the answer cards or ask again.");
    }
  }

  const staleProposal = proposal !== null && !isProposalCurrent(proposal.revision, revision);
  const visibleNotice = staleProposal ? "Your answers changed, so that suggestion was discarded. Ask again using your current plan." : notice;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="guide-overlay" />
        <Dialog.Content className="guide-dialog" onCloseAutoFocus={(event) => {
          event.preventDefault();
          // A guide-to-map transition lets the new modal keep its autofocus.
          if (document.querySelector('[role="dialog"][data-state="open"]:not(.guide-dialog)')) return;
          if (restoreQuestionFocusRef?.current) {
            restoreQuestionFocusRef.current = false;
            const question = document.querySelector<HTMLElement>(".question-title");
            if (question) { question.focus({ preventScroll: true }); return; }
          }
          const trigger = returnFocusRef?.current ?? document.querySelector<HTMLButtonElement>(".guide-trigger");
          trigger?.focus({ preventScroll: true });
        }}>
          <header className="guide-header">
            <div>
              <div className="guide-eyebrow"><NoriBlob size="small" mood={pending ? "thinking" : "idle"} className="guide-nori-avatar" /> Nori · your Marhaba guide</div>
              <Dialog.Title>Think it through with Nori</Dialog.Title>
              <Dialog.Description>Ask about your plan, or describe an answer you want to change. You approve every change.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close guide"><X size={20} /></Button></Dialog.Close>
          </header>
          <div className="guide-body" ref={bodyRef}>
            <div className="guide-message guide-message-intro">
              <p>I can explain the tradeoffs in your current plan and help update your answers.</p>
              <p className="muted">Try “What needs confirming?” or “Change my monthly budget to AED 18,000.” I use your latest answers for each request.</p>
              <span className="guide-status" aria-live="polite"><span className={`status-dot ${availability === "live" ? "status-dot-live" : ""}`} />{availability === "live" ? "Luna connected · demo planning data" : availability === "unavailable" ? "Guide unavailable · answer cards still work" : "Luna · connects when you send a message"}</span>
            </div>
            <div role="log" aria-label="Guide conversation" aria-live="polite" aria-relevant="additions">
              {messages.map((entry) => <div key={entry.id} className={`guide-message guide-message-${entry.role}`}><span className="guide-speaker">{entry.role === "user" ? "You" : "Nori"}</span><p style={{ whiteSpace: "pre-wrap" }}>{entry.text}</p></div>)}
            </div>
            {pending && <div className="guide-message guide-pending" role="status"><LoaderCircle className="spin" size={16} /> Checking your current answers and plan…</div>}
            {proposal && isProposalCurrent(proposal.revision, revision) && <section className="guide-proposal" aria-label="Suggested answer changes">
              <h3>Review these changes</h3>
              <p className="muted">Your answers stay as they are until you apply this suggestion.</p>
              {proposal.edits.map((edit) => {
                const description = describeProfileEdit(profile, edit);
                return <div className="guide-edit" key={edit.path}>
                  <strong>{description.label}</strong>
                  <div className="guide-edit-values"><span>{description.before}</span><ArrowRight size={14} aria-label="changes to" /><span>{description.after}</span></div>
                  <p className="muted">{description.consequence}</p>
                </div>;
              })}
              <div className="guide-proposal-actions"><Button onClick={apply}><Check size={16} /> Apply changes</Button><Button variant="outline" onClick={() => { setProposal(null); setNotice("Suggestion discarded. Your answers stay as they are."); }}>Discard</Button></div>
            </section>}
            {error && <p className="guide-error" role="alert">{error}</p>}
            {visibleNotice && <p className="guide-notice" role="status">{visibleNotice}</p>}
          </div>
          <form className="guide-composer" onSubmit={send}>
            <label htmlFor="guide-message">What would you like to think through?</label>
            <textarea id="guide-message" className="field" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={3} placeholder="Ask about your plan or describe a change…" disabled={pending} />
            <div className="guide-composer-actions"><span className="muted">Example estimates. Confirm details before you commit.</span><Button type="submit" disabled={pending || !message.trim()}>{pending ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />} {pending ? "Thinking…" : "Send"}</Button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
