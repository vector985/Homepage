import { formatCnDate, getWeekday } from "@/lib/date";
import type { CheckinRecord } from "@/lib/types";

const COLUMNS = [
  ["record_date", "日期"],
  ["weekday", "星期"],
  ["sleep_hours", "睡眠/h"],
  ["wake_time", "起床时间"],
  ["exercise_type", "运动项目"],
  ["exercise_minutes", "运动时长/mins"],
  ["steps", "步数"],
  ["weight_kg", "体重"],
  ["body_fat_pct", "体脂率"],
  ["target_weight_kg", "目标体重"],
  ["life_discipline", "生活节制"],
  ["impulse_spending", "冲动消费"],
  ["impulse_spending_note", "冲动消费复盘"],
  ["emotional_control", "情绪控制"],
  ["hygiene_score", "洗漱护理"],
  ["diet_score", "饮食执行"],
  ["diet_notes", "饮食记录"],
  ["planned_tasks", "今日任务"],
  ["completed_tasks", "已完成任务"],
  ["task_completion", "任务完成率"],
  ["tomorrow_tasks", "明日任务"],
  ["review_plan", "复盘规划"],
  ["income_amount", "收入"],
  ["expense_food", "餐饮支出"],
  ["expense_transport", "交通支出"],
  ["expense_shopping", "购物支出"],
  ["expense_other", "其他支出"],
  ["finance_review", "财务统计"],
  ["daily_summary", "一日凝练"],
  ["score", "评分"],
] as const;

export function downloadCsv(records: CheckinRecord[]) {
  const rows = records
    .slice()
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .map((record) => {
      const values: Record<string, unknown> = {
        ...record,
        record_date: formatCnDate(record.record_date),
        weekday: getWeekday(record.record_date),
      };
      return COLUMNS.map(([key]) => escapeCsv(values[key] ?? ""));
    });

  const content = [COLUMNS.map(([, label]) => escapeCsv(label)), ...rows]
    .map((row) => row.join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `daily-checkin-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown) {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
