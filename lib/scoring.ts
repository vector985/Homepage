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

export function calculateScore(values: CheckinFormValues): ScoreDetail {
  const items = [
    gradedItem("sleep_hours", "睡眠", 12, values.sleep_hours, () => {
      const hours = numberValue(values.sleep_hours) ?? 0;
      if (hours >= 6.5 && hours <= 8) return { earned: 12, reason: "6.5-8 小时" };
      if ((hours >= 5.5 && hours < 6.5) || (hours > 8 && hours <= 9)) {
        return { earned: 6, reason: "接近目标" };
      }
      return { earned: 0, reason: "偏离目标" };
    }),
    gradedItem("wake_time", "起床", 10, values.wake_time, () => {
      const minutes = minutesFromTime(values.wake_time) ?? 24 * 60;
      if (minutes <= 7 * 60 + 30) return { earned: 10, reason: "07:30 前" };
      if (minutes <= 8 * 60 + 30) return { earned: 5, reason: "08:30 前" };
      return { earned: 0, reason: "起床偏晚" };
    }),
    gradedItem("exercise_minutes", "运动", 12, values.exercise_minutes, () => {
      const minutes = numberValue(values.exercise_minutes) ?? 0;
      if (minutes >= 45) return { earned: 12, reason: "45 分钟以上" };
      if (minutes >= 15) return { earned: 6, reason: "15 分钟以上" };
      return { earned: 0, reason: "运动不足" };
    }),
    gradedItem("steps", "步数", 10, values.steps, () => {
      const steps = numberValue(values.steps) ?? 0;
      if (steps >= 8000) return { earned: 10, reason: "8000 步以上" };
      if (steps >= 4000) return { earned: 5, reason: "4000 步以上" };
      return { earned: 0, reason: "步数不足" };
    }),
    gradedItem("life_discipline", "生活节制", 8, values.life_discipline, () =>
      countPenalty(values.life_discipline, 8),
    ),
    gradedItem("impulse_spending", "冲动消费", 8, values.impulse_spending, () =>
      countPenalty(values.impulse_spending, 8),
    ),
    gradedItem("emotional_control", "情绪控制", 8, values.emotional_control, () =>
      countPenalty(values.emotional_control, 8),
    ),
    gradedItem("hygiene_score", "洗漱护理", 6, values.hygiene_score, () =>
      twoPointScore(values.hygiene_score, 6),
    ),
    gradedItem("diet_score", "饮食评价", 8, values.diet_score, () => twoPointScore(values.diet_score, 8)),
    gradedItem("task_completion", "任务情况", 10, values.task_completion, () => {
      const task = numberValue(values.task_completion) ?? 0;
      if (task >= 1) return { earned: 10, reason: "任务完成" };
      if (task >= 0.5) return { earned: 5, reason: "任务部分完成" };
      return { earned: 0, reason: "任务未达标" };
    }),
    gradedItem("review_plan", "复盘规划", 4, values.review_plan, () => ({
      earned: isFilledText(values.review_plan) ? 4 : 0,
      reason: isFilledText(values.review_plan) ? "已填写" : "未填写",
    })),
    gradedItem("finance_review", "财务统计", 4, values.finance_review, () => ({
      earned: isFilledText(values.finance_review) ? 4 : 0,
      reason: isFilledText(values.finance_review) ? "已填写" : "未填写",
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
