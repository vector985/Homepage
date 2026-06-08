import type { CheckinRecord, TrendPoint } from "@/lib/types";

export function buildTrendPoints(records: CheckinRecord[]): TrendPoint[] {
  const sorted = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));

  return sorted.map((record, index) => {
    const window = sorted
      .slice(Math.max(0, index - 6), index + 1)
      .map((item) => item.weight_kg)
      .filter((value): value is number => typeof value === "number");

    const movingAverageWeight =
      window.length > 0
        ? Math.round((window.reduce((sum, value) => sum + value, 0) / window.length) * 100) / 100
        : null;

    return {
      date: record.record_date,
      label: record.record_date.slice(5),
      score: record.score,
      weight: record.weight_kg,
      movingAverageWeight,
    };
  });
}

export function calculateMonthStats(records: CheckinRecord[]) {
  const scored = records.filter((record) => typeof record.score === "number");
  const averageScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, record) => sum + record.score, 0) / scored.length)
      : 0;
  const checkinDays = records.length;
  const goodDays = records.filter((record) => record.score >= 80).length;
  const latestWeight =
    [...records]
      .sort((a, b) => b.record_date.localeCompare(a.record_date))
      .find((record) => typeof record.weight_kg === "number")?.weight_kg ?? null;

  return {
    averageScore,
    checkinDays,
    goodDays,
    latestWeight,
  };
}
