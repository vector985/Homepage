-- Run this once in Supabase SQL Editor.
-- It only adds fields required by the current app and does not delete data.

alter table public.checkin_records add column if not exists exercise_type text;
alter table public.checkin_records add column if not exists body_fat_pct numeric(5, 2);
alter table public.checkin_records add column if not exists impulse_spending_note text;
alter table public.checkin_records add column if not exists diet_notes text;
alter table public.checkin_records add column if not exists planned_tasks text;
alter table public.checkin_records add column if not exists completed_tasks text;
alter table public.checkin_records add column if not exists tomorrow_tasks text;
alter table public.checkin_records add column if not exists income_amount numeric(12, 2);
alter table public.checkin_records add column if not exists expense_food numeric(12, 2);
alter table public.checkin_records add column if not exists expense_transport numeric(12, 2);
alter table public.checkin_records add column if not exists expense_shopping numeric(12, 2);
alter table public.checkin_records add column if not exists expense_other numeric(12, 2);

notify pgrst, 'reload schema';
