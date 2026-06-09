create extension if not exists pgcrypto;

create table if not exists public.checkin_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  sleep_hours numeric(4, 2),
  wake_time time,
  exercise_type text,
  exercise_minutes integer check (exercise_minutes is null or exercise_minutes >= 0),
  steps integer check (steps is null or steps >= 0),
  weight_kg numeric(5, 2),
  body_fat_pct numeric(5, 2),
  life_discipline integer check (life_discipline is null or life_discipline between 0 and 2),
  impulse_spending integer check (impulse_spending is null or impulse_spending between 0 and 2),
  impulse_spending_note text,
  emotional_control integer check (emotional_control is null or emotional_control between 0 and 2),
  hygiene_score integer check (hygiene_score is null or hygiene_score between 0 and 2),
  diet_score integer check (diet_score is null or diet_score between 0 and 4),
  diet_notes text,
  breakfast_notes text,
  lunch_notes text,
  dinner_notes text,
  snack_notes text,
  task_completion numeric(3, 2) check (task_completion is null or task_completion between 0 and 1),
  planned_tasks text,
  completed_tasks text,
  tomorrow_tasks text,
  funds_total numeric(12, 2),
  income_amount numeric(12, 2),
  expense_fixed numeric(12, 2),
  expense_food numeric(12, 2),
  expense_transport numeric(12, 2),
  expense_shopping numeric(12, 2),
  expense_health numeric(12, 2),
  expense_learning numeric(12, 2),
  expense_entertainment numeric(12, 2),
  expense_other numeric(12, 2),
  review_plan text,
  finance_review text,
  daily_summary text,
  score integer not null default 0 check (score between 0 and 100),
  score_detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkin_records_user_date_unique unique (user_id, record_date)
);

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

create index if not exists checkin_records_user_date_desc_idx
  on public.checkin_records (user_id, record_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_checkin_records_updated_at on public.checkin_records;
create trigger set_checkin_records_updated_at
before update on public.checkin_records
for each row
execute function public.set_updated_at();

alter table public.checkin_records enable row level security;

drop policy if exists "Users can read own checkins" on public.checkin_records;
create policy "Users can read own checkins"
on public.checkin_records
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own checkins" on public.checkin_records;
create policy "Users can insert own checkins"
on public.checkin_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own checkins" on public.checkin_records;
create policy "Users can update own checkins"
on public.checkin_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own checkins" on public.checkin_records;
create policy "Users can delete own checkins"
on public.checkin_records
for delete
to authenticated
using ((select auth.uid()) = user_id);
