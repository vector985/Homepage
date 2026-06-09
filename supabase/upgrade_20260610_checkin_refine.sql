-- Run this once in Supabase SQL Editor after pulling the 2026-06-10 check-in refinements.
-- It adds the current MVP fields, updates scoring constraints, and does not delete old data.

alter table public.checkin_records add column if not exists exercise_type text;
alter table public.checkin_records add column if not exists body_fat_pct numeric(5, 2);
alter table public.checkin_records add column if not exists impulse_spending_note text;
alter table public.checkin_records add column if not exists diet_notes text;
alter table public.checkin_records add column if not exists breakfast_notes text;
alter table public.checkin_records add column if not exists lunch_notes text;
alter table public.checkin_records add column if not exists dinner_notes text;
alter table public.checkin_records add column if not exists snack_notes text;
alter table public.checkin_records add column if not exists planned_tasks text;
alter table public.checkin_records add column if not exists completed_tasks text;
alter table public.checkin_records add column if not exists tomorrow_tasks text;
alter table public.checkin_records add column if not exists funds_total numeric(12, 2);
alter table public.checkin_records add column if not exists income_amount numeric(12, 2);
alter table public.checkin_records add column if not exists expense_fixed numeric(12, 2);
alter table public.checkin_records add column if not exists expense_food numeric(12, 2);
alter table public.checkin_records add column if not exists expense_transport numeric(12, 2);
alter table public.checkin_records add column if not exists expense_shopping numeric(12, 2);
alter table public.checkin_records add column if not exists expense_health numeric(12, 2);
alter table public.checkin_records add column if not exists expense_learning numeric(12, 2);
alter table public.checkin_records add column if not exists expense_entertainment numeric(12, 2);
alter table public.checkin_records add column if not exists expense_other numeric(12, 2);
alter table public.checkin_records add column if not exists finance_review text;

alter table public.checkin_records drop constraint if exists checkin_records_life_discipline_check;
alter table public.checkin_records add constraint checkin_records_life_discipline_check
  check (life_discipline is null or life_discipline between 0 and 2);

alter table public.checkin_records drop constraint if exists checkin_records_impulse_spending_check;
alter table public.checkin_records add constraint checkin_records_impulse_spending_check
  check (impulse_spending is null or impulse_spending between 0 and 2);

alter table public.checkin_records drop constraint if exists checkin_records_emotional_control_check;
alter table public.checkin_records add constraint checkin_records_emotional_control_check
  check (emotional_control is null or emotional_control between 0 and 2);

alter table public.checkin_records drop constraint if exists checkin_records_diet_score_check;
alter table public.checkin_records add constraint checkin_records_diet_score_check
  check (diet_score is null or diet_score between 0 and 4);

notify pgrst, 'reload schema';
