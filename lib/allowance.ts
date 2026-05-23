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
