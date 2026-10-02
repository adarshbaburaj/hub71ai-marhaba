"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./nori-blob.module.css";

export interface NoriBlobProps {
  size?: "small" | "medium" | "large";
  mood?: "idle" | "thinking" | "celebrate";
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NoriBlob({ size = "small", mood = "idle", interactive = false, onClick, className }: NoriBlobProps) {
  const [hop, setHop] = useState(0);
  const creature = <span key={hop} className={cn(styles.stage, hop > 0 && styles.hopping)}>
    <svg className={styles.art} viewBox="0 0 160 152" fill="none" aria-hidden="true">
      <ellipse className={styles.shadow} cx="81" cy="135" rx="34" ry="5" fill="#191919" fillOpacity=".10" />
      <g className={styles.creature}>
        <path d="M30 99C19 85 24 69 32 57C29 38 42 20 60 22C70 14 91 14 102 27C121 27 129 42 126 58C143 69 139 94 128 103C122 119 107 119 92 117C77 130 57 120 51 114C40 115 34 109 30 99Z" fill="#191919" />
        <g className={styles.eyes}>
          <rect x="53" y="57" width="20" height="29" rx="10" fill="#FAF9F6" />
          <rect x="88" y="54" width="20" height="29" rx="10" fill="#FAF9F6" />
          <g className={styles.pupils}>
            <ellipse cx="64" cy="72" rx="4" ry="6" fill="#191919" />
            <ellipse cx="99" cy="69" rx="4" ry="6" fill="#191919" />
          </g>
        </g>
        <path className={styles.smile} d="M75 92Q81 97 87 91" stroke="#FAF9F6" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  </span>;

  if (interactive) return <button
    type="button"
    className={cn(styles.blob, styles[size], styles[mood], styles.interactive, className)}
    onClick={() => { setHop((value) => value + 1); onClick?.(); }}
    aria-label="Say hello to Nori"
  >{creature}</button>;

  return <span className={cn(styles.blob, styles[size], styles[mood], className)} role="img" aria-label={mood === "thinking" ? "Nori is thinking" : "Nori, your guide"}>{creature}</span>;
}
