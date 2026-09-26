import assert from "node:assert/strict";
import test from "node:test";
import { calcScheduledAllowance, getPayoutPeriod } from "../lib/allowance";

test("monthly allowance periods use calendar-month boundaries", () => {
  const period = getPayoutPeriod("monthly", new Date(2026, 8, 26));
  assert.equal(period.start.toISOString().slice(0, 10), "2026-09-01");
  assert.equal(period.end.toISOString().slice(0, 10), "2026-10-01");
});

test("biweekly allowance periods are two full weeks", () => {
  const period = getPayoutPeriod("biweekly", new Date(2026, 8, 26));
  assert.equal((period.end.getTime() - period.start.getTime()) / 86_400_000, 14);
});

test("scheduled allowance includes the per-week base and completed-chore points", () => {
  const amount = calcScheduledAllowance(5, 40, 0.1, "biweekly", new Date(2026, 8, 14), new Date(2026, 8, 28));
  assert.equal(amount, 14);
});

test("calendar-month base allowance is prorated to the actual number of days", () => {
  const amount = calcScheduledAllowance(7, 0, 0.1, "monthly", new Date(2026, 8, 1), new Date(2026, 9, 1));
  assert.equal(amount, 30);
});
