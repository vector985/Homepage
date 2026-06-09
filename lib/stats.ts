import type { CheckinRecord, FinanceCategoryTotal, TrendPoint } from "@/lib/types";

export const FINANCE_EXPENSE_FIELDS = [
  ["expense_fixed", "固定"],
  ["expense_food", "餐饮"],
  ["expense_transport", "交通"],
  ["expense_shopping", "购物"],
  ["expense_health", "健康"],
  ["expense_learning", "学习"],
  ["expense_entertainment", "娱乐"],
  ["expense_other", "其他"],
] as const;

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
      exerciseMinutes: record.exercise_minutes,
      expenseTotal: calculateExpenseTotal(record),
      fundsTotal: record.funds_total,
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
  const highScoreRate = checkinDays > 0 ? Math.round((goodDays / checkinDays) * 100) : 0;
  const totalIncome = roundMoney(records.reduce((sum, record) => sum + (record.income_amount ?? 0), 0));
  const totalExpense = roundMoney(records.reduce((sum, record) => sum + calculateExpenseTotal(record), 0));
  const netChange = roundMoney(totalIncome - totalExpense);
  const latestFunds =
    [...records]
      .sort((a, b) => b.record_date.localeCompare(a.record_date))
      .find((record) => typeof record.funds_total === "number")?.funds_total ?? null;
  const totalExerciseMinutes = records.reduce((sum, record) => sum + (record.exercise_minutes ?? 0), 0);
  const averageSteps = average(records.map((record) => record.steps));

  return {
    averageScore,
    checkinDays,
    goodDays,
    highScoreRate,
    latestWeight,
    latestFunds,
    totalIncome,
    totalExpense,
    netChange,
    totalExerciseMinutes,
    averageSteps,
    expenseCategories: calculateExpenseCategories(records),
  };
}

export function calculateExpenseTotal(record: CheckinRecord) {
  return FINANCE_EXPENSE_FIELDS.reduce((sum, [key]) => sum + (record[key] ?? 0), 0);
}

function calculateExpenseCategories(records: CheckinRecord[]): FinanceCategoryTotal[] {
  return FINANCE_EXPENSE_FIELDS.map(([key, label]) => ({
    key,
    label,
    value: roundMoney(records.reduce((sum, record) => sum + (record[key] ?? 0), 0)),
  })).filter((item) => item.value > 0);
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
