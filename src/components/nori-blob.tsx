"use client";

import { useId, useState } from "react";
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
  const id = useId();
  const creature = <span key={hop} className={cn(styles.stage, hop > 0 && styles.hopping)}>
    <svg className={styles.art} viewBox="0 0 180 194" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sage`} x1="39" y1="42" x2="133" y2="160" gradientUnits="userSpaceOnUse"><stop stopColor="#C9CFB2" /><stop offset="1" stopColor="#8F9C7D" /></linearGradient>
        <linearGradient id={`${id}-cream`} x1="70" y1="50" x2="117" y2="119" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF9E9" /><stop offset="1" stopColor="#E8E1CA" /></linearGradient>
        <linearGradient id={`${id}-horn`} x1="73" y1="8" x2="79" y2="51" gradientUnits="userSpaceOnUse"><stop stopColor="#818C68" /><stop offset="1" stopColor="#596348" /></linearGradient>
      </defs>
      <ellipse className={styles.shadow} cx="96" cy="184" rx="42" ry="5" fill="#3A422D" fillOpacity=".12" />
      <g className={styles.creature}>
        <path d="M126 144C143 149 151 137 145 127C143 123 138 128 137 134C131 130 124 133 126 144Z" fill={`url(#${id}-cream)`} />
        <path d="M117 148L133 148L137 174Q138 181 130 182L118 181Z" fill="#859172" />
        <path d="M115 172L136 172L137 178Q137 184 131 184L119 183Z" fill="#566147" />
        <path d="M64 114C74 104 105 104 118 116C135 131 132 152 126 165L122 178Q120 184 110 182L105 164L92 163L84 177Q82 184 72 181L66 162C55 149 55 129 64 114Z" fill={`url(#${id}-sage)`} />
        <path d="M83 112C77 126 82 131 77 146C76 158 88 166 97 161C108 155 104 140 105 133C102 121 97 115 99 110Z" fill={`url(#${id}-cream)`} />
        <path d="M68 170L86 172L84 179Q83 184 75 184L70 183Q66 181 68 170Z" fill="#566147" />
        <path d="M105 171L124 172L124 180Q122 186 113 185L108 184Z" fill="#566147" />
        <g className={styles.wave}>
          <path d="M66 136C50 138 34 128 28 115C23 105 29 94 36 96C44 98 43 111 49 114L68 115Z" fill={`url(#${id}-sage)`} />
          <path d="M28 115C21 106 26 96 32 95C39 94 43 101 41 109L34 116Z" fill="#596348" />
        </g>
        <path d="M65 49C59 38 60 15 68 7C76 4 82 28 82 47Z" fill={`url(#${id}-horn)`} />
        <path d="M104 48C104 29 114 6 121 13C128 21 122 44 119 54Z" fill={`url(#${id}-horn)`} />
        <path d="M62 27L77 32M62 37L80 41M110 29L124 34M107 40L121 45" stroke="#4D583E" strokeOpacity=".35" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M51 62C42 45 13 36 10 47C5 67 20 91 43 86Z" fill={`url(#${id}-sage)`} />
        <path d="M42 68C33 54 18 50 19 57C19 70 27 80 39 80Z" fill={`url(#${id}-cream)`} />
        <path d="M130 67C143 51 168 50 170 61C173 79 157 94 136 88Z" fill={`url(#${id}-sage)`} />
        <path d="M139 73C149 63 165 62 161 70C155 81 149 84 140 83Z" fill={`url(#${id}-cream)`} />
        <path d="M32 88C32 54 57 38 89 41C123 41 148 62 148 94C151 123 130 137 91 137C52 138 29 122 32 88Z" fill={`url(#${id}-sage)`} />
        <path d="M34 89C37 72 48 60 62 62C75 62 81 83 89 83C97 83 105 62 119 66C137 70 147 89 147 105C146 126 126 138 92 138C54 138 31 122 34 89Z" fill={`url(#${id}-cream)`} />
        <g className={styles.eyes}>
          <ellipse cx="62" cy="94" rx="12" ry="17" transform="rotate(10 62 94)" fill="#38372F" />
          <ellipse cx="120" cy="98" rx="12" ry="17" transform="rotate(9 120 98)" fill="#38372F" />
          <g className={styles.pupils} fill="#FFFCF2">
            <ellipse cx="66" cy="87" rx="4" ry="5" />
            <ellipse cx="124" cy="91" rx="4" ry="5" />
            <circle cx="58" cy="102" r="1.8" opacity=".4" />
            <circle cx="116" cy="106" r="1.8" opacity=".4" />
          </g>
        </g>
        <ellipse cx="47" cy="111" rx="7" ry="3.5" fill="#D5BCA5" opacity=".4" />
        <ellipse cx="133" cy="114" rx="7" ry="3.5" fill="#D5BCA5" opacity=".4" />
        <path d="M83 108Q90 104 99 109Q99 114 91 117Q85 114 83 108Z" fill="#65704E" />
        <path className={styles.smile} d="M80 119Q91 131 104 119" stroke="#4D543E" strokeWidth="2.5" strokeLinecap="round" />
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
