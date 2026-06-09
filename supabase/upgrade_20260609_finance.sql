-- Run this once in Supabase SQL Editor.
-- It adds finance management fields used by the current app and does not delete data.

alter table public.checkin_records add column if not exists cash_balance numeric(12, 2);
alter table public.checkin_records add column if not exists bank_balance numeric(12, 2);
alter table public.checkin_records add column if not exists alipay_balance numeric(12, 2);
alter table public.checkin_records add column if not exists wechat_balance numeric(12, 2);
alter table public.checkin_records add column if not exists investment_balance numeric(12, 2);
alter table public.checkin_records add column if not exists debt_amount numeric(12, 2);
alter table public.checkin_records add column if not exists expense_fixed numeric(12, 2);
alter table public.checkin_records add column if not exists expense_health numeric(12, 2);
alter table public.checkin_records add column if not exists expense_learning numeric(12, 2);
alter table public.checkin_records add column if not exists expense_entertainment numeric(12, 2);

notify pgrst, 'reload schema';
