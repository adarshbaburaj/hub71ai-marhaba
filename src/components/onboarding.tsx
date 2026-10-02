"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, HelpCircle, MapPin } from "lucide-react";
import { deriveNodes, nodeLabels, nodeOrder } from "@/lib/onboarding";
import { adjacentQuestion, applyQuestionAnswer, questionsForNode, questionsForProfile, readQuestionAnswer, type MoveQuestion, type QuestionAnswer, type QuestionOption } from "@/lib/questions";
import { generatePlans } from "@/lib/planner";
import { hasPartner, schoolChildCount } from "@/lib/profile";
import type { MoveProfile, NodeId } from "@/lib/types";
import { aed, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MoveTree } from "@/components/move-tree";
import { AreaExplorer } from "@/components/area-explorer";
import { NoriBlob } from "@/components/nori-blob";
import styles from "./onboarding.module.css";

export interface OnboardingProps {
  profile: MoveProfile;
  questionMode?: "quick" | "details";
  onModeChange?: (mode: "quick" | "details") => void;
  onChange: (profile: MoveProfile, node: NodeId) => void;
  onFinish: () => void;
  visited: NodeId[];
  onVisit: (node: NodeId) => void;
  activeNode: NodeId;
  onActiveNode: (node: NodeId) => void;
  activeQuestionId?: string | null;
  onQuestionChange?: (id: string | null) => void;
  answeredQuestionIds?: string[];
  onQuestionCommit?: (id: string) => void;
  onMapOpen?: () => void;
  onAskNori?: () => void;
  guidePaused?: boolean;
  onGuidePause?: (paused: boolean) => void;
}

export function Onboarding(props: OnboardingProps) {
  const [localQuestionId, setLocalQuestionId] = useState<string | null>(null);
  const [localAnsweredIds, setLocalAnsweredIds] = useState<string[]>([]);
  const [localGuidePaused, setLocalGuidePaused] = useState(false);
  const requestedId = props.activeQuestionId === undefined ? localQuestionId : props.activeQuestionId;
  const order = nodeOrder(props.profile);
  const activeNode = order.includes(props.activeNode) ? props.activeNode : "household";
  const quickMode = props.questionMode !== "details";
  const allBranchQuestions = questionsForNode(props.profile, activeNode);
  const branchQuestions = questionsForNode(props.profile, activeNode, { coreOnly: quickMode });
  const question = allBranchQuestions.find((item) => item.id === requestedId) ?? branchQuestions[0] ?? allBranchQuestions[0];
  const guidePaused = props.guidePaused ?? localGuidePaused;
  const answeredIds = props.answeredQuestionIds ?? localAnsweredIds;
  const activeQuestions = questionsForProfile(props.profile, { coreOnly: quickMode });
  const nodes = deriveNodes(props.profile, props.visited);
  // The current branch is reachable without pretending it has already been completed.
  const currentNode = deriveNodes(props.profile, [...props.visited, activeNode]).find((node) => node.id === activeNode);
  const visibleNodes = nodes.some((node) => node.id === activeNode) || !currentNode ? nodes : [...nodes, currentNode];
  const branchProgress = Object.fromEntries(visibleNodes.map((node) => {
    const questions = activeQuestions.filter((item) => item.node === node.id);
    return [node.id, props.visited.includes(node.id) ? 1 : questions.length ? questions.filter((item) => answeredIds.includes(item.id)).length / questions.length : 0];
  }));
  const answeredCount = activeQuestions.filter((item) => answeredIds.includes(item.id) || props.visited.includes(item.node)).length;

  function setQuestion(id: string | null) {
    setLocalQuestionId(id);
    props.onQuestionChange?.(id);
  }

  function selectBranch(node: NodeId) {
    props.onModeChange?.("details");
    props.onActiveNode(node);
    setQuestion(null);
  }

  function goTo(next: MoveQuestion) {
    if (next.node !== activeNode) props.onActiveNode(next.node);
    setQuestion(next.id);
  }

  function pauseGuide(paused: boolean) {
    setLocalGuidePaused(paused);
    props.onGuidePause?.(paused);
  }

  function commitQuestion(id: string) {
    setLocalAnsweredIds((current) => current.includes(id) ? current : [...current, id]);
    props.onQuestionCommit?.(id);
  }

  if (!question) return null;

  return <div className={styles.layout}>
    <MoveTree nodes={visibleNodes} activeNode={activeNode} onSelect={selectBranch} activeProgress={branchProgress[activeNode] ?? 0} answeredCount={answeredCount} branchProgress={branchProgress}>
      <QuestionTransition editorProps={{
        ...props,
        activeNode,
        question,
        branchQuestions: branchQuestions.length ? branchQuestions : allBranchQuestions,
        guidePaused,
        onGuidePause: pauseGuide,
        onQuestionCommit: commitQuestion,
        onGoTo: goTo,
      }} />
    </MoveTree>
  </div>;
}

interface QuestionEditorProps extends OnboardingProps {
  question: MoveQuestion;
  branchQuestions: MoveQuestion[];
  guidePaused: boolean;
  onGuidePause: (paused: boolean) => void;
  onGoTo: (question: MoveQuestion) => void;
}

// Retain the outgoing prompt until its exit finishes. Its controls become inert
// immediately, so a quick double click cannot commit an old question twice.
function QuestionTransition({ editorProps }: { editorProps: QuestionEditorProps }) {
  const incomingKey = `${editorProps.question.id}:${JSON.stringify(editorProps.profile)}`;
  const [targetKey, setTargetKey] = useState(incomingKey);
  const [displayed, setDisplayed] = useState({ key: incomingKey, props: editorProps });
  const [phase, setPhase] = useState<"entering" | "steady" | "exiting" | "thinking">("entering");
  const [finishing, setFinishing] = useState(false);

  if (incomingKey !== targetKey) {
    setTargetKey(incomingKey);
    setPhase("exiting");
    if (finishing && displayed.props.question.id !== editorProps.question.id) setFinishing(false);
  }

  useEffect(() => {
    if (phase === "steady") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      if (phase === "exiting") {
        setPhase("thinking");
      } else if (phase === "thinking") {
        if (finishing) editorProps.onFinish();
        else {
          setDisplayed({ key: incomingKey, props: editorProps });
          setPhase("entering");
        }
      } else if (phase === "entering") setPhase("steady");
    }, reducedMotion ? 0 : phase === "thinking" ? 450 : phase === "exiting" ? 140 : 220);
    return () => window.clearTimeout(timer);
  }, [incomingKey, phase, finishing, editorProps]);

  const visibleProps = displayed.key === incomingKey ? editorProps : displayed.props;
  return <div className={styles.prompt} data-question-transition={phase} inert={phase === "exiting" ? true : undefined} aria-hidden={phase === "exiting" ? true : undefined}>
    {phase === "thinking" ? <div className={styles.thinking} role="status" aria-live="polite">
      {!editorProps.guidePaused && <NoriBlob size="small" mood="thinking" />}
      <p>{finishing ? "Putting your answers together…" : "Connecting the next part…"}</p>
    </div> : <QuestionEditor
      key={displayed.key}
      {...visibleProps}
      onFinish={() => { setFinishing(true); setPhase("exiting"); }}
    />}
  </div>;
}

function QuestionEditor({ profile, questionMode, onModeChange, onChange, onFinish, onVisit, activeNode, question, branchQuestions, onGoTo, onMapOpen, onAskNori, guidePaused, onGuidePause, onQuestionCommit }: QuestionEditorProps) {
  const [answer, setAnswer] = useState<QuestionAnswer>(() => readQuestionAnswer(profile, question));
  const [bedrooms, setBedrooms] = useState(profile.home.bedrooms);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const retainedAges = useRef(profile.household.childAges ? [...profile.household.childAges] : [profile.household.child.age]);
  const heading = useRef<HTMLHeadingElement>(null);
  const isEditing = questionMode === "details";
  const selectedValues = Array.isArray(answer) ? answer.filter((value): value is string => typeof value === "string") : [];
  const previous = adjacentQuestion(profile, question.id, -1, { coreOnly: !isEditing });
  const branchIndex = branchQuestions.findIndex((item) => item.id === question.id);
  const finalQuestion = adjacentQuestion(profile, question.id, 1, { coreOnly: !isEditing }) === null;
  const promptId = `question-${question.id}`;
  const hintId = `hint-${question.id}`;
  const storedAnswer = readQuestionAnswer(profile, question);
  const customValues = question.id === "lifestyle-hobbies" && Array.isArray(storedAnswer) ? storedAnswer.filter((value): value is string => typeof value === "string") : question.id === "business-field" && typeof storedAnswer === "string" && storedAnswer ? [storedAnswer] : [];
  const answerOptions: QuestionOption[] = [...question.options ?? [], ...customValues.filter((value) => !question.options?.some((option) => option.value === value)).map((value) => ({ value, label: value }))];
  const ages = question.kind === "ages" && Array.isArray(answer) ? answer.map(value => typeof value === "number" ? value : null) : [];
  const budgetExamples = useMemo(() => {
    if (question.id !== "money-budget") return [];
    const result = generatePlans({ ...profile, money: { ...profile.money, monthlyBudget: null } });
    return [...result.alternatives, ...result.conditional].map(plan => plan.finance.monthlyHousehold);
  }, [profile, question.id]);
  const budgetStarter = budgetExamples.length ? Math.min(...budgetExamples) : (hasPartner(profile) ? 1_400_000 : 1_000_000) + schoolChildCount(profile) * 300_000;
  const quickQuestions = questionsForProfile(profile, { coreOnly: true });
  const quickIndex = quickQuestions.findIndex(item => item.id === question.id);

  useEffect(() => {
    heading.current?.focus({ preventScroll: !window.matchMedia("(max-width: 850px)").matches });
  }, []);

  function proceed(commit: boolean) {
    const confirmed = commit ? applyQuestionAnswer(profile, question, answer) : profile;
    const nextProfile = !commit ? profile : question.id === "home-areas"
      ? { ...confirmed, home: { ...confirmed.home, bedrooms } }
      : question.kind === "ages"
        ? { ...confirmed, household: { ...confirmed.household, childAges: [...ages, ...retainedAges.current.slice(ages.length)] } }
        : confirmed;
    if (commit) onChange(nextProfile, activeNode);
    onQuestionCommit?.(question.id);
    const next = adjacentQuestion(nextProfile, question.id, 1, { coreOnly: !isEditing });
    if (!next || next.node !== activeNode) onVisit(activeNode);
    if (next) onGoTo(next);
    else onFinish();
  }

  function toggleOption(value: string) {
    const selected = selectedValues;
    setAnswer(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  const contextChange = question.id === "household-composition" && ["family", "single-parent"].includes(profile.household.composition ?? "") && answer !== "family" && answer !== "single-parent"
    ? "School fees, journeys and tasks will leave the plan. Your child’s answers will be kept if you bring this branch back."
    : question.id === "transport-car" && profile.transport.car !== "none" && answer === "none"
      ? "We’ll recheck homes, school journeys and costs using supported arrangements without a car."
      : question.id === "partner-work" && ["office", "hybrid"].includes(profile.household.partner.work) && !["office", "hybrid"].includes(String(answer))
        ? "The regular office commute will leave the plan. Your partner’s location will be kept for later."
        : null;

  return <section className="question-document" aria-labelledby={promptId} data-question-id={question.id} data-answer-kind={question.kind}>
    <div className="question-document-topline">
      <span className="question-breadcrumb">{nodeLabels[activeNode]}</span>
      <span className="question-step-label">{isEditing ? `${branchIndex + 1} / ${branchQuestions.length} · DETAILS` : quickIndex < 0 ? "SAVED DETAIL" : `${quickIndex + 1} / ${quickQuestions.length} · QUICK PLAN`}</span>
    </div>
    <div className="question-prompt">
      {!guidePaused && (onAskNori
        ? <button type="button" aria-label="Ask Nori about this question" onClick={onAskNori}><NoriBlob key={question.id} size="medium" mood="celebrate" /></button>
        : <NoriBlob key={question.id} size="medium" mood="celebrate" />)}
      <h2 ref={heading} tabIndex={-1} id={promptId} className="question-title">{question.title}</h2>
    </div>
    <form onSubmit={(event) => { event.preventDefault(); proceed(true); }} onKeyDown={(event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); event.currentTarget.requestSubmit(); }
    }}>
      <div className="question-answer">
        {question.id === "home-areas" && <>
          <div className={styles.areaPanel}><AreaExplorer profile={profile} selectedAreas={selectedValues} onToggle={toggleOption} /></div>
          <label className={styles.bedrooms}>Bedrooms <input aria-label="Bedrooms" type="number" min={1} max={10} step={1} required value={bedrooms} onChange={event => setBedrooms(Number(event.target.value))} /></label>
        </>}
        {(question.kind === "choice" || question.kind === "multiple") && question.id !== "home-areas" && <div className="document-choices" data-choice-layout={answerOptions.length > 4 ? "compact-grid" : "list"} role="group" aria-labelledby={promptId} aria-describedby={question.hint ? hintId : undefined}>
          {answerOptions.map((option, index) => {
            const selected = question.kind === "multiple" ? selectedValues.includes(String(option.value)) : answer === option.value || answer === null && option.value === "";
            const priorityIndex = question.ordered ? selectedValues.indexOf(String(option.value)) : -1;
            return <button
              key={String(option.value)}
              type="button"
              className={cn("document-choice", selected && "is-selected")}
              aria-label={option.label}
              aria-pressed={selected}
              onClick={() => question.kind === "multiple" ? toggleOption(String(option.value)) : setAnswer(option.value)}
            >
              <span className="document-choice-number" aria-hidden="true">{question.ordered && priorityIndex >= 0 ? priorityIndex + 1 : String.fromCharCode(65 + index)}</span>
              <span className="document-choice-copy"><span>{option.label}</span>{option.detail && <span className="document-choice-detail">{option.detail}</span>}</span>
              <span className="document-choice-check" aria-hidden="true">{selected && <Check size={15} strokeWidth={2.5} />}</span>
            </button>;
          })}
        </div>}
        {question.kind === "ages" && <>
          <div className={styles.childAges}>
          {ages.map((age, index) => <label key={index}>
            <span>Child {index + 1}</span>
            <div><input aria-label={`Child ${index + 1} age`} type="number" inputMode="numeric" min={0} max={21} step={1} placeholder="Age" value={age ?? ""} onChange={event => {
              const value = event.target.value === "" ? null : Number(event.target.value);
              retainedAges.current[index] = value;
              setAnswer(ages.map((stored, child) => child === index ? value : stored));
            }} /><small>years</small></div>
          </label>)}
          </div>
          <div className={styles.childActions}>
            <button type="button" disabled={ages.length >= 20} onClick={() => setAnswer([...ages, retainedAges.current[ages.length] ?? null])}>Add child</button>
            <button type="button" disabled={ages.length <= 1} onClick={() => setAnswer(ages.slice(0, -1))}>Remove last child</button>
            <span>{ages.length} {ages.length === 1 ? "child" : "children"}</span>
          </div>
        </>}
        {question.kind === "number" && <div className={cn("document-input-wrap", question.currency && "has-prefix")}>
          {question.currency && <span className="document-input-prefix" aria-hidden="true">AED</span>}
          <input
            className="document-input"
            id={`answer-${question.id}`}
            aria-label={question.title}
            aria-describedby={question.hint ? hintId : undefined}
            type="number"
            inputMode={question.currency ? "decimal" : "numeric"}
            min={question.min ?? 0}
            max={question.max ?? (question.currency ? 1_000_000_000 : undefined)}
            step={question.currency ? "0.01" : 1}
            placeholder={question.placeholder ?? (question.optional ? "Leave open for now" : "Your answer")}
            required={!question.optional}
            value={typeof answer === "number" ? question.currency ? answer / 100 : answer : ""}
            onChange={(event) => {
              const raw = event.target.value;
              const value = Number(raw);
              setAnswer(raw === "" || !Number.isFinite(value) ? null : question.currency ? Math.round(value * 100) : value);
            }}
          />
        </div>}
        {question.id === "money-budget" && <div className={styles.budgetExample}>
          <p>{budgetExamples.length
            ? `Demo plans: ${aed(budgetStarter)}–${aed(Math.max(...budgetExamples))}/month. Household costs; extra quotes excluded.`
            : `Synthetic starting point: ${aed(budgetStarter)}/month. Your requirements may need more; nursery, further education and other extra quotes are excluded.`}</p>
          <button type="button" onClick={() => setAnswer(budgetStarter)}>Use this example</button>
        </div>}
        {(question.kind === "text" || question.kind === "date") && <input
          className="document-input"
          id={`answer-${question.id}`}
          aria-label={question.title}
          aria-describedby={question.hint ? hintId : undefined}
          type={question.kind === "date" ? "date" : "text"}
          required={question.kind === "date" && !question.optional}
          maxLength={question.maxLength}
          placeholder={question.placeholder}
          value={typeof answer === "string" ? answer : ""}
          onChange={(event) => setAnswer(event.target.value || (question.kind === "date" && question.optional ? null : ""))}
        />}
        {question.kind === "textarea" && <textarea
          className="document-textarea"
          id={`answer-${question.id}`}
          aria-label={question.title}
          aria-describedby={question.hint ? hintId : undefined}
          rows={3}
          maxLength={question.maxLength}
          placeholder={question.placeholder}
          value={typeof answer === "string" ? answer : ""}
          onChange={(event) => setAnswer(event.target.value)}
        />}
        {question.hint && <p id={hintId} className="document-hint">{question.hint}</p>}
        {question.ordered && selectedValues.length > 0 && <p className="document-priority-order" aria-live="polite">{selectedValues.map((value, index) => `${index + 1}. ${answerOptions.find((option) => option.value === value)?.label ?? value}`).join(" → ")}</p>}
        {contextChange && <p className="document-change-note" role="status">{contextChange}</p>}
      </div>
      <div className="question-document-actions">
        <Button type="submit">{isEditing ? "Apply changes" : finalQuestion ? "See my first plan" : "Continue"}<ArrowRight size={16} /></Button>
        <Button type="button" variant="ghost" onClick={() => proceed(false)}>Skip for now</Button>
        <Button type="button" variant="ghost" disabled={!previous} onClick={() => previous && onGoTo(previous)} aria-label="Previous question"><ArrowLeft size={15} />Back</Button>
      </div>
    </form>
    <div className="question-document-tools">
      {!isEditing && <button type="button" onClick={() => { onModeChange?.("details"); onGoTo(questionsForNode(profile, activeNode)[0]); }}>More details</button>}
      {isEditing && <button type="button" onClick={onFinish}>Back to my plans</button>}
      <button type="button" onClick={() => setExplanationOpen(!explanationOpen)} aria-expanded={explanationOpen}><HelpCircle size={14} />Why we ask</button>
      {question.nearby && onMapOpen && <button type="button" onClick={onMapOpen}><MapPin size={14} />Explore nearby</button>}
      <button type="button" onClick={() => onGuidePause(!guidePaused)}>{guidePaused ? "Resume Nori" : "Pause Nori"}</button>
    </div>
    {explanationOpen && <p className="document-hint question-explanation">{activeNode === "business-money" || activeNode === "money"
      ? "These optional assumptions help compare payment timing and available cash. Missing amounts remain unknown. Company money and household money are calculated separately."
      : activeNode === "child"
        ? "Ages and curriculum help match school stages. Activities and school transport can change the home options. Admission, exact school placement and fees need confirmation."
        : activeNode === "lifestyle"
          ? "Your hobbies and habits help you explore everyday places around the move. They do not set banking preferences, change essential requirements or add unconfirmed costs."
          : activeNode === "transport"
            ? "Travel choices affect which homes, workplaces and schools can work together. Removing car access recalculates complete plans and keeps your chosen plan available for review."
            : "This answer connects one part of your move to the others. You can leave it open and return to any revealed branch later. Nothing is committed until you continue."}</p>}
  </section>;
}
