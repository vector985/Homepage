const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toMonthKey(dateString: string) {
  return dateString.slice(0, 7);
}

export function getMonthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const next = new Date(year, month, 1);
  return {
    start,
    end: toLocalDateString(next),
  };
}

export function getWeekday(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}

export function formatCnDate(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${year}.${Number(month)}.${Number(day)}`;
}

export function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}
