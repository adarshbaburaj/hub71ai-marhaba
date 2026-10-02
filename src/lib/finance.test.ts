import { describe, expect, it } from "vitest";
import { activities, homes, schools, workplaces } from "./data";
import { calculateFinance, financeFixture, monthDate } from "./finance";
import { sampleProfile } from "./profile";

const options = { home: homes[0], school: schools[0], workplace: workplaces[0], transport: "rental" as const };

describe("dated finance", () => {
  it("scales sibling school fees, bus seats, activity places and dated payments exactly", () => {
    const p = sampleProfile();
    p.household.children = 3;
    p.household.childAges = [6, 9, 12];
    const activity = activities[0];
    const result = calculateFinance(p, { ...options, activity, transport: "bus-taxi" });
    expect(result.costs.find(cost => cost.label.startsWith("School"))?.monthly).toBe(Math.round(options.school.annualFee * 3 / 12));
    expect(result.events.filter(event => event.id.startsWith("school-")).reduce((total, event) => total - event.amount, 0)).toBe(options.school.annualFee * 3);
    expect(result.events.filter(event => event.id.startsWith("activity-")).reduce((total, event) => total - event.amount, 0)).toBe(activity.monthlyCost * 3 * 12);
    expect(result.costs.find(cost => cost.label.startsWith("Transport"))?.monthly).toBe(90_000 + 25_000 * 3 + 10_000 * 3);
    expect(result.costs.find(cost => cost.label.startsWith("Living"))?.monthly).toBe(500_000 + 60_000 * 2);
    const arrivalEvents = result.events.filter(event => event.date === p.money.moveDate && event.account === "household");
    expect(arrivalEvents.reduce((total, event) => total - event.amount, 0)).toBe(result.arrivalCash);
  });

  it("does not apply school or activity fees to infants while preserving sibling fees", () => {
    const p = sampleProfile();
    p.household.children = 2;
    p.household.childAges = [2, 8];
    const result = calculateFinance(p, { ...options, activity: activities[0] });
    expect(result.events.filter(event => event.id.startsWith("school-")).reduce((total, event) => total - event.amount, 0)).toBe(options.school.annualFee);
    expect(result.events.find(event => event.id === "activity-0")?.amount).toBe(-activities[0].monthlyCost);
    expect(result.partial).toBe(true);
    p.household.composition = "solo";
    const dormant = calculateFinance(p, { ...options, activity: activities[0] });
    expect(dormant.events.some(event => /^(school|activity)-/.test(event.id))).toBe(false);
    expect(p.household.childAges).toEqual([2, 8]);
  });

  it("matches the supplied fixture without adding monthly equivalents to cash payments", () => {
    expect(financeFixture()).toEqual({ initialPayment: 33_600, cashRemaining: 66_400, monthlyExpenses: 13_000 });
    const result = calculateFinance(sampleProfile(), options);
    const rentEvents = result.events.filter(e => e.id.startsWith("rent-"));
    const schoolEvents = result.events.filter(e => e.id.startsWith("school-"));
    expect(rentEvents).toHaveLength(4);
    expect(schoolEvents).toHaveLength(3);
    expect(rentEvents.reduce((sum, e) => sum - e.amount, 0)).toBe(options.home.annualRent);
    expect(schoolEvents.reduce((sum, e) => sum - e.amount, 0)).toBe(options.school.annualFee);
    expect(result.events.filter(e => e.id.startsWith("living-")).length).toBe(12);
    expect(result.events.filter(e => e.id.startsWith("income-")).length).toBe(12);
  });

  it("identifies refundable deposits without recurring expense or invented refund", () => {
    const result = calculateFinance(sampleProfile(), options);
    expect(result.deposit).toBe(options.home.deposit + 150_000);
    const deposits = result.events.filter(e => e.kind === "deposit");
    expect(deposits).toHaveLength(2);
    expect(deposits.every(e => e.amount < 0)).toBe(true);
    expect(result.events.some(e => e.label.includes("refund") && e.amount > 0)).toBe(false);
    expect(result.costs.some(c => c.label.includes("deposit"))).toBe(false);
  });

  it("does not forecast unknown opening cash, income or business spending", () => {
    for (const key of ["cash", "monthlyIncome"] as const) {
      const p = sampleProfile();
      p.money[key] = null;
      expect(calculateFinance(p, options).householdProjection).toBeNull();
    }
    const p = sampleProfile();
    p.business.includeFinances = true;
    p.business.cash = 10_000_000;
    p.business.monthlyReceipts = 2_000_000;
    expect(calculateFinance(p, options).businessProjection).toBeNull();
    expect(calculateFinance(p, options).partial).toBe(true);
  });

  it("uses matching founder transfers in two separate accounts", () => {
    const p = sampleProfile();
    p.business.includeFinances = true;
    p.business.cash = 10_000_000;
    p.business.monthlyReceipts = 2_000_000;
    p.business.monthlySpending = 200_000;
    p.business.founderPay = 500_000;
    const result = calculateFinance(p, options);
    expect(result.businessProjection).not.toBeNull();
    const transfers = result.events.filter(e => e.kind === "transfer");
    expect(transfers).toHaveLength(24);
    expect(transfers.reduce((sum, e) => sum + e.amount, 0)).toBe(0);
    expect(transfers.filter(e => e.account === "household").every(e => e.amount === 500_000)).toBe(true);
    expect(transfers.filter(e => e.account === "business").every(e => e.amount === -500_000)).toBe(true);
    expect(result.monthlyBusiness).toBe(880_000);
    expect(result.costs.filter(c => c.account === "household").some(c => c.label.includes("Founder"))).toBe(false);
  });

  it("evaluates shortages at dated payment events before monthly income", () => {
    const p = sampleProfile();
    p.money.cash = 5_000_000;
    p.money.reserve = 1_000_000;
    const result = calculateFinance(p, options);
    expect(result.householdProjection).not.toBeNull();
    expect(result.firstBelowReserve).not.toBeNull();
    expect(result.lowestHousehold).toBeLessThan(p.money.reserve);
    expect(result.events[0].amount).toBeLessThan(0);
    const projection = result.householdProjection!;
    expect(projection.at(-1)?.balance).toBe(p.money.cash! + result.events.filter(e => e.account === "household").reduce((sum, event) => sum + event.amount, 0));
  });

  it("clamps monthly dates and handles invalid user dates without throwing", () => {
    expect(monthDate("2027-01-31", 1)).toBe("2027-02-28");
    expect(monthDate("2028-01-31", 1)).toBe("2028-02-29");
    const p = sampleProfile();
    p.money.moveDate = "2027-13-15";
    expect(() => calculateFinance(p, options)).not.toThrow();
    expect(calculateFinance(p, options).householdProjection).toBeNull();
    expect(calculateFinance(p, options).events).toHaveLength(0);
  });

  it("rejects a reference cash date later than the projected move", () => {
    const p = sampleProfile();
    p.money.referenceDate = monthDate(p.money.moveDate!, 1);
    expect(calculateFinance(p, options).householdProjection).toBeNull();
  });

  it("uses an editable reference date for an illustrative 12-month schedule when arrival is undecided", () => {
    const p = sampleProfile();
    p.money.moveDate = null;
    p.money.referenceDate = "2027-03-22";
    const result = calculateFinance(p, options);
    expect(result.partial).toBe(true);
    expect(result.householdProjection?.[0].date).toBe("2027-03-22");
    expect(result.events[0].date).toBe("2027-03-22");
    expect(result.events.filter(event => event.id.startsWith("rent-"))).toHaveLength(4);
    expect(result.events.filter(event => event.id.startsWith("school-"))).toHaveLength(3);
    expect(result.events.filter(event => event.id.startsWith("income-"))).toHaveLength(12);
    expect(result.events.filter(event => event.id.startsWith("rent-")).reduce((sum, event) => sum - event.amount, 0)).toBe(options.home.annualRent);
    expect(result.events.filter(event => event.id.startsWith("school-")).reduce((sum, event) => sum - event.amount, 0)).toBe(options.school.annualFee);
    expect(result.householdProjection?.at(-1)?.balance).toBe(p.money.cash! + result.events.filter(event => event.account === "household").reduce((sum, event) => sum + event.amount, 0));
    p.money.referenceDate = "2027-04-22";
    expect(calculateFinance(p, options).events[0].date).toBe("2027-04-22");
  });

  it("does not create dates when both arrival and a valid reference are unavailable", () => {
    const p = sampleProfile();
    p.money.moveDate = null;
    p.money.referenceDate = "";
    const result = calculateFinance(p, options);
    expect(result.events).toHaveLength(0);
    expect(result.householdProjection).toBeNull();
  });

  it("keeps all 12 monthly periods within the horizon for early-month and end-month anchors", () => {
    for (const moveDate of ["2027-01-01", "2027-01-07", "2027-01-31"]) {
      const p = sampleProfile();
      p.money.moveDate = moveDate;
      p.money.referenceDate = moveDate;
      const result = calculateFinance(p, options);
      const horizon = monthDate(moveDate, 12);
      expect(result.events.every(event => event.date >= moveDate && event.date < horizon)).toBe(true);
      expect(result.events.filter(event => event.id.startsWith("living-"))).toHaveLength(12);
      expect(result.events.filter(event => event.id.startsWith("income-"))).toHaveLength(12);
      for (let month = 0; month < 12; month++) {
        expect(result.events.find(event => event.id === `living-${month}`)!.date < result.events.find(event => event.id === `income-${month}`)!.date).toBe(true);
      }
    }
  });
});
