export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isMonthlyChoreOpen(dueDate: Date | null, date = new Date()) {
  return Boolean(dueDate && date.getDate() <= dueDate.getDate());
}
