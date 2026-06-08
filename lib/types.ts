export type ScoreItem = {
  key: string;
  label: string;
  max: number;
  earned: number;
  reason: string;
};

export type ScoreDetail = {
  total: number;
  items: ScoreItem[];
};

export type CheckinRecord = {
  id?: string;
  user_id: string;
  record_date: string;
  sleep_hours: number | null;
  wake_time: string | null;
  exercise_type: string | null;
  exercise_minutes: number | null;
  steps: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  life_discipline: number | null;
  impulse_spending: number | null;
  impulse_spending_note: string | null;
  emotional_control: number | null;
  hygiene_score: number | null;
  diet_score: number | null;
  diet_notes: string | null;
  task_completion: number | null;
  planned_tasks: string | null;
  completed_tasks: string | null;
  tomorrow_tasks: string | null;
  income_amount: number | null;
  expense_food: number | null;
  expense_transport: number | null;
  expense_shopping: number | null;
  expense_other: number | null;
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
};
