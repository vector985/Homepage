import type { CheckinFormValues, ScoreDetail, ScoreItem } from "@/lib/types";

function numberValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function minutesFromTime(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function scoreItem(
  key: string,
  label: string,
  max: number,
  result: { earned: number; reason: string },
): ScoreItem {
  return {
    key,
    label,
    max,
    earned: result.earned,
    reason: result.reason,
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
  const items: ScoreItem[] = [
    scoreItem("sleep_hours", "睡眠时长", 20, scoreSleep(values.sleep_hours)),
    scoreItem("wake_time", "起床时间", 10, scoreWakeTime(values.wake_time)),
    scoreItem("exercise_minutes", "运动执行", 15, scoreExercise(values.exercise_minutes, values.exercise_type)),
    scoreItem("steps", "日常活动", 10, scoreSteps(values.steps)),
    scoreItem("hygiene_score", "洗漱护理", 5, scoreDefinedLevel(values.hygiene_score, 5)),
    scoreItem("diet_score", "饮食执行", 10, scoreDefinedLevel(values.diet_score, 10)),
    scoreItem("emotional_control", "情绪控制", 5, scoreEventCount(values.emotional_control, 5)),
    scoreItem("impulse_spending", "冲动消费", 5, scoreEventCount(values.impulse_spending, 5)),
    scoreItem("life_discipline", "生活节制", 5, scoreEventCount(values.life_discipline, 5)),
    scoreItem("task_completion", "任务完成", 15, scoreTaskCompletion(values.task_completion)),
  ];

  return {
    total: Math.round(items.reduce((sum, item) => sum + item.earned, 0)),
    items,
  };
}

function scoreSleep(value: number | null) {
  const hours = numberValue(value);
  if (hours === null) return { earned: 0, reason: "尚未记录" };
  if (hours >= 7 && hours <= 8.5) return { earned: 20, reason: "达到 7-8.5 小时" };
  if ((hours >= 6 && hours < 7) || (hours > 8.5 && hours <= 9.5)) {
    return { earned: 12, reason: "接近建议范围" };
  }
  if (hours >= 5) return { earned: 5, reason: "睡眠偏少或偏多" };
  return { earned: 0, reason: "睡眠明显不足" };
}

function scoreWakeTime(value: string | null) {
  const minutes = minutesFromTime(value);
  if (minutes === null) return { earned: 0, reason: "尚未记录" };
  if (minutes <= 7 * 60 + 30) return { earned: 10, reason: "07:30 前起床" };
  if (minutes <= 8 * 60 + 30) return { earned: 6, reason: "08:30 前起床" };
  if (minutes <= 9 * 60 + 30) return { earned: 3, reason: "09:30 前起床" };
  return { earned: 0, reason: "起床较晚" };
}

function scoreExercise(minutesValue: number | null, type: string | null) {
  const minutes = numberValue(minutesValue);
  if (minutes === null) return { earned: 0, reason: "尚未记录" };
  if (type === "休息" && minutes === 0) return { earned: 10, reason: "主动安排休息日" };
  if (minutes >= 45) return { earned: 15, reason: "运动 45 分钟以上" };
  if (minutes >= 30) return { earned: 12, reason: "运动 30 分钟以上" };
  if (minutes >= 15) return { earned: 7, reason: "完成短时运动" };
  return { earned: 0, reason: "运动不足 15 分钟" };
}

function scoreSteps(value: number | null) {
  const steps = numberValue(value);
  if (steps === null) return { earned: 0, reason: "尚未记录" };
  if (steps >= 8000) return { earned: 10, reason: "达到 8000 步" };
  if (steps >= 5000) return { earned: 7, reason: "达到 5000 步" };
  if (steps >= 3000) return { earned: 3, reason: "达到 3000 步" };
  return { earned: 0, reason: "日常活动较少" };
}

function scoreDefinedLevel(value: number | null, max: number) {
  const level = numberValue(value);
  if (level === null) return { earned: 0, reason: "尚未记录" };
  if (level >= 2) return { earned: max, reason: "完整完成" };
  if (level >= 1) return { earned: Math.round(max * 0.6), reason: "基本完成" };
  return { earned: 0, reason: "未完成或偏离计划" };
}

function scoreEventCount(value: number | null, max: number) {
  const count = numberValue(value);
  if (count === null) return { earned: 0, reason: "尚未记录" };
  if (count === 0) return { earned: max, reason: "今天没有发生" };
  if (count === 1) return { earned: Math.round(max * 0.4), reason: "发生一次" };
  return { earned: 0, reason: "发生多次" };
}

function scoreTaskCompletion(value: number | null) {
  const completion = numberValue(value);
  if (completion === null) return { earned: 0, reason: "尚未添加任务" };
  if (completion >= 1) return { earned: 15, reason: "全部完成" };
  if (completion >= 0.75) return { earned: 12, reason: "完成大部分任务" };
  if (completion >= 0.5) return { earned: 8, reason: "完成一半任务" };
  if (completion > 0) return { earned: 4, reason: "已开始推进" };
  return { earned: 0, reason: "尚未完成任务" };
}
