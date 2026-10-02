"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import type { MoveNode } from "@/lib/onboarding";
import type { NodeId } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./move-tree.module.css";

// Branch tips stay in the same place as answers are edited or restored.
const positions: Record<NodeId, { x: number; y: number }> = {
  business: { x: 128, y: 520 },
  workspace: { x: 128, y: 433 },
  "business-money": { x: 128, y: 346 },
  household: { x: 472, y: 520 },
  partner: { x: 472, y: 433 },
  child: { x: 472, y: 346 },
  lifestyle: { x: 472, y: 259 },
  home: { x: 128, y: 259 },
  transport: { x: 472, y: 172 },
  money: { x: 128, y: 172 },
  priorities: { x: 128, y: 85 },
};

const branches: Record<NodeId, { path: string; root: number; width: number }> = {
  business: { path: "M300 578 C276 576 266 536 228 520", root: 578, width: 6 },
  workspace: { path: "M266.11725 550.53025 C255 525 264 462 228 433", root: 578, width: 4 },
  "business-money": { path: "M266.11725 550.53025 C246 491 269 377 228 346", root: 578, width: 3.5 },
  household: { path: "M300 553 C328 549 344 537 372 520", root: 553, width: 5.5 },
  partner: { path: "M342.624 537.808 C352 511 344 460 372 433", root: 553, width: 4 },
  child: { path: "M342.624 537.808 C358 484 336 379 372 346", root: 553, width: 3.5 },
  lifestyle: { path: "M342.624 537.808 C371 440 337 296 372 259", root: 553, width: 3 },
  home: { path: "M301 324 C277 305 268 275 228 259", root: 324, width: 4.5 },
  transport: { path: "M298 252 C323 232 336 186 372 172", root: 252, width: 4 },
  money: { path: "M301 224 C278 217 260 181 228 172", root: 224, width: 4 },
  priorities: { path: "M274.584 205.264 C261 184 261 106 228 85", root: 224, width: 3 },
};

interface MoveTreeProps {
  nodes: MoveNode[];
  activeNode: NodeId;
  onSelect: (id: NodeId) => void;
  activeProgress?: number;
  answeredCount?: number;
  branchProgress?: Partial<Record<NodeId, number>>;
}

const stateLabel = (node: MoveNode, activeNode: NodeId) => activeNode === node.id
  ? "Current question"
  : node.status === "answered" ? "Answered" : "Undecided";

function twigPath(id: NodeId, index: number) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = branches[id].path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const t = .82 - index * .13;
  const u = 1 - t;
  const x = u ** 3 * x0 + 3 * u ** 2 * t * x1 + 3 * u * t ** 2 * x2 + t ** 3 * x3;
  const y = u ** 3 * y0 + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * y3;
  const dx = 3 * u ** 2 * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t ** 2 * (x3 - x2);
  const dy = 3 * u ** 2 * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t ** 2 * (y3 - y2);
  const length = Math.hypot(dx, dy);
  const side = index % 2 ? -1 : 1;
  const nx = -dy / length * side;
  const ny = dx / length * side;
  return `M${x} ${y} q${nx * 8} ${ny * 8} ${nx * 12 + dx / length * 4} ${ny * 12 + dy / length * 4}`;
}

export function MoveTree({ nodes, activeNode, onSelect, activeProgress = 0, answeredCount, branchProgress }: MoveTreeProps) {
  const clipId = useId().replaceAll(":", "");
  const top = Math.min(610, ...nodes.map((node) => branches[node.id].root)) - 9;
  const answered = answeredCount ?? nodes.filter((node) => node.status === "answered").length;

  return <section className={styles.shell} aria-label="Your move, taking shape">
    <div className={styles.heading}>
      <span>Your move, taking shape</span>
      <span className={styles.count}>{answered} {answered === 1 ? "answer" : "answers"}</span>
    </div>
    <div className={styles.canvas}>
      <svg className={styles.lines} viewBox="0 0 600 700" fill="none" aria-hidden="true" preserveAspectRatio="none">
        <defs><clipPath id={clipId}><rect x="0" y={top} width="600" height={700 - top} /></clipPath></defs>
        <path className={styles.trunk} d="M300 617 C309 584 293 542 302 493 C312 442 294 401 300 350 C309 303 289 281 301 234 C309 207 302 185 300 156" clipPath={`url(#${clipId})`} stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        {nodes.map((node) => <path
          key={node.id}
          className={cn(styles.branch, activeNode === node.id && styles.activeBranch)}
          d={branches[node.id].path}
          pathLength="1"
          stroke="currentColor"
          strokeWidth={branches[node.id].width}
          strokeLinecap="round"
        />)}
        {nodes.map((node) => {
          const progress = Math.min(1, Math.max(0, branchProgress?.[node.id] ?? (node.status === "answered" ? 1 : node.id === activeNode ? activeProgress : 0)));
          return <g key={node.id} className={styles.buds}>
            {[0, 1, 2].map((index) => <path key={index} className={styles.twig} pathLength="1" d={twigPath(node.id, index)} style={{ strokeDashoffset: 1 - Math.min(1, Math.max(0, progress * 3 - index)) }} />)}
          </g>;
        })}
        <path d="M300 617 Q287 636 266 642 M300 617 Q310 636 329 640" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div key={answered} className={styles.root}><span>Abu Dhabi</span><small>Your next chapter</small></div>
      {nodes.map((node) => <button
        type="button"
        key={node.id}
        className={cn(styles.node, node.parent && styles.child, activeNode === node.id && styles.active, node.status === "answered" && styles.answered)}
        style={{ left: `${positions[node.id].x / 600 * 100}%`, top: `${positions[node.id].y / 700 * 100}%` }}
        onClick={() => onSelect(node.id)}
        aria-current={activeNode === node.id ? "step" : undefined}
        aria-label={`${node.label}. ${node.summary}. ${stateLabel(node, activeNode)}. Edit answer`}
      >
        <span className={styles.label}><span>{node.label}</span>{node.status === "answered" && <Check size={12} aria-hidden="true" strokeWidth={3} />}</span>
        <span key={node.summary} className={styles.summary}>{node.summary}</span>
        <span className={styles.state}>{stateLabel(node, activeNode)}</span>
      </button>)}
    </div>
    <nav className={styles.outline} aria-label="Your move branches">
      {nodes.map((node) => <button
        type="button"
        key={node.id}
        className={cn(styles.outlineNode, activeNode === node.id && styles.active, node.parent && styles.child)}
        onClick={() => onSelect(node.id)}
        aria-current={activeNode === node.id ? "step" : undefined}
        aria-label={`${node.label}. ${node.summary}. ${stateLabel(node, activeNode)}. Edit answer`}
      >
        <span className={styles.label}><span>{node.label}</span>{node.status === "answered" && <Check size={12} aria-hidden="true" strokeWidth={3} />}</span>
        <span className={styles.summary}>{node.summary}</span>
        <span className={styles.state}>{stateLabel(node, activeNode)}</span>
      </button>)}
    </nav>
    <p className={styles.footer}>Click any branch to change your answer.</p>
  </section>;
}
