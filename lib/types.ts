export type ScoreItem = {
  key: string;
  label: string;
  max: number;
  earned: number;
  reason: string;
};

export type ScoreDetail = {
  total: number;
  missing: string[];
  items: ScoreItem[];
};

export type CheckinRecord = {
  id?: string;
  user_id: string;
  record_date: string;
  sleep_hours: number | null;
  wake_time: string | null;
  exercise_minutes: number | null;
  steps: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  life_discipline: number | null;
  impulse_spending: number | null;
  emotional_control: number | null;
  hygiene_score: number | null;
  diet_score: number | null;
  task_completion: number | null;
  review_plan: string | null;
  finance_review: string | null;
  daily_summary: string | null;
  score: number;
  score_detail: ScoreDetail;
  created_at?: string;
  updated_at?: string;
};

export type CheckinFormValues = Omit<
  CheckinRecord,
  "id" | "user_id" | "score" | "score_detail" | "created_at" | "updated_at"
>;

export type TrendPoint = {
  date: string;
  label: string;
  score: number | null;
  weight: number | null;
  movingAverageWeight: number | null;
  targetWeight: number | null;
};
