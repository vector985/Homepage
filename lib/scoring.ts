import type { CheckinFormValues, ScoreDetail, ScoreItem } from "@/lib/types";

function numberValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isFilledText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function minutesFromTime(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function gradedItem(
  key: string,
  label: string,
  max: number,
  value: unknown,
  calculate: () => { earned: number; reason: string },
) {
  if (value === null || value === undefined || value === "") {
    return {
      key,
      label,
      max,
      earned: 0,
      reason: "未填写",
      missing: true,
    };
  }

  return {
    key,
    label,
    max,
    missing: false,
    ...calculate(),
  };
}

export function calculateSleepStart(wakeTime: string | null, sleepHours: number | null) {
  const wakeMinutes = minutesFromTime(wakeTime);
  const hours = numberValue(sleepHours);
  if (wakeMinutes === null || hours === null) return "";

  const total = Math.round((wakeMinutes - hours * 60 + 24 * 60) % (24 * 60));
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function calculateScore(values: CheckinFormValues): ScoreDetail {
  const items = [
    gradedItem("sleep_hours", "睡眠时长", 10, values.sleep_hours, () => {
      const hours = numberValue(values.sleep_hours) ?? 0;
      if (hours >= 6.5 && hours <= 8) return { earned: 10, reason: "6.5-8 小时" };
      if ((hours >= 5.5 && hours < 6.5) || (hours > 8 && hours <= 9)) return { earned: 5, reason: "接近目标" };
      return { earned: 0, reason: "偏离目标" };
    }),
    gradedItem("wake_time", "起床时间", 6, values.wake_time, () => {
      const minutes = minutesFromTime(values.wake_time) ?? 24 * 60;
      if (minutes <= 7 * 60 + 30) return { earned: 6, reason: "07:30 前" };
      if (minutes <= 8 * 60 + 30) return { earned: 3, reason: "08:30 前" };
      return { earned: 0, reason: "起床偏晚" };
    }),
    gradedItem("exercise_minutes", "运动执行", 8, values.exercise_minutes, () => {
      const minutes = numberValue(values.exercise_minutes) ?? 0;
      const hasType = isFilledText(values.exercise_type);
      if (minutes >= 45 && hasType) return { earned: 8, reason: "45 分钟以上且记录项目" };
      if (minutes >= 30) return { earned: 6, reason: "30 分钟以上" };
      if (minutes >= 15) return { earned: 4, reason: "15 分钟以上" };
      return { earned: 0, reason: "运动不足" };
    }),
    gradedItem("steps", "步数", 6, values.steps, () => {
      const steps = numberValue(values.steps) ?? 0;
      if (steps >= 8000) return { earned: 6, reason: "8000 步以上" };
      if (steps >= 4000) return { earned: 3, reason: "4000 步以上" };
      return { earned: 0, reason: "步数不足" };
    }),
    gradedItem("weight_kg", "身体记录", 4, values.weight_kg, () => {
      if (numberValue(values.weight_kg) !== null && numberValue(values.body_fat_pct) !== null) {
        return { earned: 4, reason: "体重和体脂已记录" };
      }
      return { earned: 2, reason: "已记录体重" };
    }),
    gradedItem("hygiene_score", "洗漱护理", 3, values.hygiene_score, () => twoPointScore(values.hygiene_score, 3)),
    gradedItem("diet_notes", "饮食记录", 3, values.diet_notes, () => ({
      earned: isFilledText(values.diet_notes) ? 3 : 0,
      reason: isFilledText(values.diet_notes) ? "已记录饮食" : "未记录",
    })),
    gradedItem("life_discipline", "生活节制", 7, values.life_discipline, () => countPenalty(values.life_discipline, 7)),
    gradedItem("impulse_spending", "冲动消费", 7, values.impulse_spending, () => {
      const score = countPenalty(values.impulse_spending, 7);
      if ((numberValue(values.impulse_spending) ?? 0) > 0 && !isFilledText(values.impulse_spending_note)) {
        return { earned: Math.max(0, score.earned - 2), reason: "有冲动消费但未复盘原因" };
      }
      return score;
    }),
    gradedItem("emotional_control", "情绪控制", 6, values.emotional_control, () => countPenalty(values.emotional_control, 6)),
    gradedItem("task_completion", "任务完成", 15, values.task_completion, () => {
      const task = numberValue(values.task_completion) ?? 0;
      if (task >= 1) return { earned: 15, reason: "全部完成" };
      if (task >= 0.75) return { earned: 12, reason: "大部分完成" };
      if (task >= 0.5) return { earned: 8, reason: "完成一半" };
      if (task > 0) return { earned: 4, reason: "少量完成" };
      return { earned: 0, reason: "未完成" };
    }),
    gradedItem("planned_tasks", "任务清单", 5, values.planned_tasks, () => ({
      earned: isFilledText(values.planned_tasks) ? 5 : 0,
      reason: isFilledText(values.planned_tasks) ? "已列出今日任务" : "未列出",
    })),
    gradedItem("review_plan", "复盘规划", 10, values.review_plan, () => ({
      earned: isFilledText(values.review_plan) && isFilledText(values.tomorrow_tasks) ? 10 : isFilledText(values.review_plan) ? 6 : 0,
      reason:
        isFilledText(values.review_plan) && isFilledText(values.tomorrow_tasks)
          ? "已复盘并安排明日任务"
          : isFilledText(values.review_plan)
            ? "已复盘，未安排明日任务"
            : "未复盘",
    })),
    gradedItem("finance_review", "财务记录", 10, values.finance_review, () => {
      const hasAmount =
        numberValue(values.income_amount) !== null ||
        numberValue(values.expense_food) !== null ||
        numberValue(values.expense_transport) !== null ||
        numberValue(values.expense_shopping) !== null ||
        numberValue(values.expense_other) !== null;
      if (hasAmount && isFilledText(values.finance_review)) return { earned: 10, reason: "金额和说明完整" };
      if (hasAmount) return { earned: 7, reason: "已记录金额" };
      if (isFilledText(values.finance_review)) return { earned: 5, reason: "已记录说明" };
      return { earned: 0, reason: "未记录" };
    }),
    gradedItem("daily_summary", "一日凝练", 5, values.daily_summary, () => ({
      earned: isFilledText(values.daily_summary) ? 5 : 0,
      reason: isFilledText(values.daily_summary) ? "已完成总结" : "未填写",
    })),
  ];

  const scoreItems: ScoreItem[] = items.map((item) => ({
    key: item.key,
    label: item.label,
    max: item.max,
    earned: item.earned,
    reason: item.reason,
  }));
  const total = Math.round(scoreItems.reduce((sum, item) => sum + item.earned, 0));

  return {
    total,
    missing: items.filter((item) => item.missing).map((item) => item.label),
    items: scoreItems,
  };
}

function countPenalty(value: number | null, max: number) {
  const count = numberValue(value) ?? 0;
  if (count === 0) return { earned: max, reason: "0 次" };
  if (count === 1) return { earned: max / 2, reason: "1 次" };
  return { earned: 0, reason: "超过 1 次" };
}

function twoPointScore(value: number | null, max: number) {
  const score = numberValue(value) ?? 0;
  if (score >= 2) return { earned: max, reason: "2 分" };
  if (score >= 1) return { earned: max / 2, reason: "1 分" };
  return { earned: 0, reason: "0 分" };
}
