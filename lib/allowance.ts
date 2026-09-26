export function calcWeeklyAllowance(
  baseRate: number,
  pointsEarned: number,
  pointsToDollar: number
): number {
  return Number((baseRate + pointsEarned * pointsToDollar).toFixed(2));
}

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export const PAYOUT_SCHEDULES = ["weekly", "biweekly", "monthly"] as const;
export type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number];

export function cleanPayoutSchedule(value: unknown): PayoutSchedule | null {
  return typeof value === "string" && PAYOUT_SCHEDULES.includes(value as PayoutSchedule) ? value as PayoutSchedule : null;
}

export function getPayoutPeriod(schedule: PayoutSchedule, date = new Date()) {
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  if (schedule === "monthly") {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { start, end: new Date(end.getFullYear(), end.getMonth() + 1, 1) };
  }
  const start = getWeekStart(end);
  if (schedule === "biweekly") {
    const anchor = new Date(1970, 0, 5);
    const weeks = Math.floor((start.getTime() - anchor.getTime()) / 604_800_000);
    if (weeks % 2 !== 0) start.setDate(start.getDate() - 7);
  }
  const periodEnd = new Date(start);
  periodEnd.setDate(periodEnd.getDate() + (schedule === "biweekly" ? 14 : 7));
  return { start, end: periodEnd };
}

export function calcScheduledAllowance(baseRate: number, pointsEarned: number, pointsToDollar: number, schedule: PayoutSchedule, start: Date, end: Date) {
  const weeks = (end.getTime() - start.getTime()) / 604_800_000;
  return Number((baseRate * weeks + pointsEarned * pointsToDollar).toFixed(2));
}
