"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import type { MoveNode } from "@/lib/onboarding";
import type { NodeId } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./move-tree.module.css";

const stages: { id: NodeId; label: string; nodes: NodeId[] }[] = [
  { id: "business", label: "Business", nodes: ["business", "workspace", "business-money"] },
  { id: "household", label: "Household", nodes: ["household", "partner", "child", "lifestyle"] },
  { id: "home", label: "Home", nodes: ["home"] },
  { id: "transport", label: "Transport", nodes: ["transport"] },
  { id: "money", label: "Money & priorities", nodes: ["money", "priorities"] },
];

interface MoveTreeProps {
  nodes: MoveNode[];
  activeNode: NodeId;
  onSelect: (id: NodeId) => void;
  activeProgress?: number;
  answeredCount?: number;
  branchProgress?: Partial<Record<NodeId, number>>;
  children?: ReactNode;
}

const stateLabel = (node: MoveNode, activeNode: NodeId) => activeNode === node.id
  ? "Current question"
  : node.status === "answered" ? "Answered" : "Undecided";

function BranchButton({ node, activeNode, onSelect, major = false, label }: {
  node: MoveNode;
  activeNode: NodeId;
  onSelect: (id: NodeId) => void;
  major?: boolean;
  label?: string;
}) {
  return <button
    type="button"
    data-move-node={node.id}
    data-major-stage={major || undefined}
    className={cn(styles.node, major ? styles.major : styles.detail, activeNode === node.id && styles.active)}
    onClick={() => onSelect(node.id)}
    aria-current={activeNode === node.id ? "step" : undefined}
    aria-label={`${node.label}. ${node.summary}. ${stateLabel(node, activeNode)}. Edit answer`}
    title={node.summary}
  >
    <span className={styles.label}><span>{label ?? node.label}</span>{node.status === "answered" && <Check size={12} aria-hidden="true" strokeWidth={3} />}</span>
    {major && <span key={node.summary} className={styles.summary}>{node.summary}</span>}
    <span className={styles.state}>{stateLabel(node, activeNode)}</span>
  </button>;
}

export function MoveTree({ nodes, activeNode, onSelect, activeProgress = 0, answeredCount, branchProgress, children }: MoveTreeProps) {
  const answered = answeredCount ?? nodes.filter((node) => node.status === "answered").length;
  const activeStageIndex = Math.max(0, stages.findIndex((stage) => stage.nodes.includes(activeNode)));
  const activeStage = stages[activeStageIndex];
  const timeline = stages.map((stage, index) => ({
    ...stage,
    index,
    main: nodes.find((node) => node.id === stage.id) ?? { id: stage.id, label: stage.label, summary: "We’ll shape this next", status: "undecided" as const, branch: index },
    details: nodes.filter((node) => stage.nodes.includes(node.id) && node.id !== stage.id),
  }));

  return <section className={styles.shell} aria-label="Your move, taking shape">
    <div className={styles.heading}><span>Your Abu Dhabi move</span><span className={styles.count}>{answered} {answered === 1 ? "answer" : "answers"} · always editable</span></div>
    <nav className={styles.timeline} data-move-timeline="desktop" aria-label="Your move branches">
      {timeline.map(stage => {
        const progressNode = stage.nodes.includes(activeNode) ? nodes.find(node => node.id === activeNode) : stage.main;
        const progress = Math.min(1, Math.max(0, progressNode ? branchProgress?.[progressNode.id] ?? (progressNode.status === "answered" ? 1 : progressNode.id === activeNode ? activeProgress : 0) : 0));
        return <div key={stage.id} className={cn(styles.stage, stage.id === activeStage.id && styles.currentStage)} data-timeline-stage={stage.id} data-mobile-stage={stage.id}>
          <span className={styles.junction} aria-hidden="true">{stage.index + 1}</span>
          <BranchButton node={stage.main} activeNode={activeNode} onSelect={onSelect} major label={stage.label} />
          <span className={styles.progress} style={{ width: `${progress * 100}%` }} aria-hidden="true" />
          {stage.details.length > 0 && <div className={styles.details}>{stage.details.map(node => <BranchButton key={node.id} node={node} activeNode={activeNode} onSelect={onSelect} />)}</div>}
        </div>;
      })}
    </nav>
    {children && <div className={styles.promptArea}><div className={styles.prompt} data-active-prompt data-active-node={activeNode} data-stage={activeStage.id}>{children}</div></div>}
    <p className={styles.footer}>Open any branch to revisit an answer.</p>
  </section>;
}
