"use client";

import { useId, useState } from "react";
import { monthDate } from "@/lib/finance";
import type { FinanceResult } from "@/lib/types";
import { aed, cn, dateLabel } from "@/lib/utils";
import styles from "./money-flow.module.css";

interface MoneyFlowProps {
  finance: FinanceResult;
  account: "household" | "business";
  startDate: string;
  illustrative: boolean;
}

export function MoneyFlow({ finance, account, startDate, illustrative }: MoneyFlowProps) {
  const id = useId();
  const [view, setView] = useState<"monthly" | "timing">("timing");
  const [selected, setSelected] = useState(0);
  const parsedStart = new Date(`${startDate}T12:00:00Z`);
  const dateKnown = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && Number.isFinite(parsedStart.getTime()) && parsedStart.toISOString().slice(0, 10) === startDate && monthDate(startDate, 0) === startDate;
  // Founder pay moves between accounts; it is shown separately in the payments list.
  const costs = finance.costs.filter((cost) => cost.account === account && !cost.label.includes("(transfer"));
  const monthly = costs.reduce((sum, cost) => sum + cost.monthly, 0);
  const outgoing = finance.events.filter((event) => event.account === account && event.amount < 0 && (event.kind === "expense" || event.kind === "deposit"));
  const periods = Array.from({ length: 12 }, (_, index) => {
    const start = dateKnown ? monthDate(startDate, index) : null, end = dateKnown ? monthDate(startDate, index + 1) : null;
    const events = start && end ? outgoing.filter((event) => event.date >= start && event.date < end) : [];
    const expense = events.filter((event) => event.kind === "expense").reduce((sum, event) => sum - event.amount, 0);
    const deposit = events.filter((event) => event.kind === "deposit").reduce((sum, event) => sum - event.amount, 0);
    const label = start ? new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Asia/Dubai" }).format(new Date(`${start}T12:00:00Z`)) : `P${index + 1}`;
    return { start, end, label, expense: view === "monthly" ? monthly : expense, deposit: view === "monthly" ? 0 : deposit };
  });
  const peak = Math.max(...periods.map((period) => period.expense + period.deposit), 0);
  const scale = peak || 1;
  const current = periods[selected];
  const title = account === "household" ? "Household" : "Business";
  const partial = account === "business" ? finance.monthlyBusiness === null || finance.partial : finance.partial;
  const hasData = view === "monthly" ? costs.length > 0 : dateKnown && outgoing.some((event) => event.date >= periods[0].start! && event.date < periods[11].end!);
  const total = periods.reduce((sum, period) => sum + period.expense + period.deposit, 0);

  return <section className={styles.flow} aria-labelledby={`${id}-title`}>
    <div className={styles.header}>
      <div><h2 id={`${id}-title`}>How spending moves</h2><p>{title} · {dateKnown ? illustrative ? "Illustrative dates" : "Planned dates" : "Schedule date needed"}</p></div>
      <div className={styles.toggle} role="group" aria-label="Spending view">
        <button type="button" aria-pressed={view === "monthly"} onClick={() => setView("monthly")}>Monthly spending</button>
        <button type="button" aria-pressed={view === "timing"} onClick={() => setView("timing")}>Payment timing</button>
      </div>
    </div>
    {hasData ? <>
      <div className={styles.axis}><span>{aed(peak)} peak {view === "monthly" ? "monthly equivalent" : "payments"}</span><span>{aed(total)} over 12 periods</span></div>
      <svg className={styles.chart} viewBox="0 0 600 120" preserveAspectRatio="none" role="img" aria-label={`${title} ${view === "monthly" ? "monthly-equivalent spending" : "dated expense and deposit payments"} over twelve monthly periods${dateKnown ? ` from ${dateLabel(startDate)}` : " without a schedule date"}. Peak ${aed(peak)}; total ${aed(total)}. Select a period below to read its amounts.`}>
        <path d="M0 14H600M0 64H600M0 114H600" stroke="#E5E1DA" strokeWidth="1" />
        {periods.map((period, index) => {
          const expenseHeight = period.expense / scale * 100, depositHeight = period.deposit / scale * 100;
          return <g key={index} className={cn(styles.bar, index === selected && styles.selectedBar)}>
            <rect className={styles.expense} x={index * 50 + 14} y={114 - expenseHeight} width="22" height={expenseHeight} rx="2" />
            <rect className={styles.deposit} x={index * 50 + 14} y={114 - expenseHeight - depositHeight} width="22" height={depositHeight} rx="2" />
            {index === selected && <path d={`M${index * 50 + 9} 118H${index * 50 + 41}`} stroke="#C95443" strokeWidth="2" />}
          </g>;
        })}
      </svg>
      <div className={styles.months} role="group" aria-label="Inspect a monthly period">
        {periods.map((period, index) => <button type="button" key={index} aria-pressed={selected === index} aria-label={`Period ${index + 1}${period.start ? `, from ${dateLabel(period.start)}` : ""}: ${aed(period.expense)} ${view === "monthly" ? "monthly-equivalent spending" : "expense payments"}, ${aed(period.deposit)} refundable deposits`} onClick={() => setSelected(index)} onFocus={() => setSelected(index)} onMouseEnter={() => setSelected(index)}>{period.label}</button>)}
      </div>
      <div className={styles.summary} aria-live="polite"><strong>{current.start ? `${illustrative ? "Illustrative" : "From"} ${dateLabel(current.start)}` : `Period ${selected + 1}`}</strong><span><b>{aed(current.expense)}</b> {view === "monthly" ? "monthly equivalent" : "expense payments"}{view === "timing" && <> · <b>{aed(current.deposit)}</b> deposits</>}</span></div>
      <div className={styles.legend}><span><i className={styles.expenseKey} />{view === "monthly" ? "Monthly equivalents" : "Expense payments"}</span>{view === "timing" && <span><i className={styles.depositKey} />Refundable deposits</span>}</div>
    </> : <p className={styles.empty}>{view === "timing" ? "No dated payments are available for this account yet. Monthly spending shows any priced costs." : "No priced spending is available for this account yet."}</p>}
    <p className={styles.note}>Payment amounts, not a balance forecast. {view === "monthly" ? "Monthly equivalents; timing follows instalments." : "Instalments are counted once."} Transfers are separate.{partial && " Unquoted costs are excluded."}</p>
  </section>;
}
