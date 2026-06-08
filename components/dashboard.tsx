"use client";

import { MiniChart } from "@/components/mini-chart";
import { formatCnDate, getMonthRange, getWeekday, shiftMonth, toLocalDateString, toMonthKey } from "@/lib/date";
import { downloadCsv } from "@/lib/export";
import { calculateScore, calculateSleepStart } from "@/lib/scoring";
import { buildTrendPoints, calculateMonthStats } from "@/lib/stats";
import type { CheckinFormValues, CheckinRecord } from "@/lib/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  HeartPulse,
  History,
  ListChecks,
  LogOut,
  Save,
  Star,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

type View = "today" | "health" | "habits" | "tasks" | "finance" | "score" | "history" | "trend";
type UpdateForm = <K extends keyof CheckinFormValues>(key: K, value: CheckinFormValues[K]) => void;

const emptyForm = (date = toLocalDateString()): CheckinFormValues => ({
  record_date: date,
  sleep_hours: null,
  wake_time: null,
  exercise_type: "",
  exercise_minutes: null,
  steps: null,
  weight_kg: null,
  target_weight_kg: null,
  body_fat_pct: null,
  life_discipline: null,
  impulse_spending: null,
  impulse_spending_note: "",
  emotional_control: null,
  hygiene_score: null,
  diet_score: null,
  diet_notes: "",
  task_completion: null,
  planned_tasks: "",
  completed_tasks: "",
  tomorrow_tasks: "",
  income_amount: null,
  expense_food: null,
  expense_transport: null,
  expense_shopping: null,
  expense_other: null,
  review_plan: "",
  finance_review: "",
  daily_summary: "",
});

const sections = [
  {
    view: "health" as const,
    icon: HeartPulse,
    title: "健康生活",
    desc: "睡眠、起床、运动、体重体脂、洗漱护理和饮食",
  },
  {
    view: "habits" as const,
    icon: Star,
    title: "习惯养成",
    desc: "情绪控制、冲动消费和生活节制",
  },
  {
    view: "tasks" as const,
    icon: ListChecks,
    title: "每日任务",
    desc: "今日任务、完成情况、复盘和明日安排",
  },
  {
    view: "finance" as const,
    icon: WalletCards,
    title: "财务统计",
    desc: "收入、支出分类和财务复盘",
  },
];

const exerciseOptions = ["臀腿", "胸臂", "核心", "有氧", "拉伸", "休息", "其他"];

export function Dashboard({ supabase, user }: { supabase: SupabaseClient; user: User }) {
  const [selectedDate, setSelectedDate] = useState(toLocalDateString());
  const [monthKey, setMonthKey] = useState(toMonthKey(toLocalDateString()));
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [form, setForm] = useState<CheckinFormValues>(() => emptyForm(selectedDate));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<View>("today");

  const score = useMemo(() => calculateScore(form), [form]);
  const trendPoints = useMemo(() => buildTrendPoints(records), [records]);
  const stats = useMemo(() => calculateMonthStats(records), [records]);
  const sleepStart = useMemo(
    () => calculateSleepStart(form.wake_time, form.sleep_hours),
    [form.wake_time, form.sleep_hours],
  );

  const loadMonth = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const range = getMonthRange(monthKey);
    const { data, error } = await supabase
      .from("checkin_records")
      .select("*")
      .gte("record_date", range.start)
      .lt("record_date", range.end)
      .order("record_date", { ascending: false });

    if (error) {
      setMessage(formatDataError(error.message));
    } else {
      setRecords((data ?? []) as CheckinRecord[]);
    }
    setLoading(false);
  }, [monthKey, supabase]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    const existing = records.find((record) => record.record_date === selectedDate);
    setForm(existing ? recordToForm(existing) : emptyForm(selectedDate));
  }, [records, selectedDate]);

  function update<K extends keyof CheckinFormValues>(key: K, value: CheckinFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onDateChange(value: string) {
    setSelectedDate(value);
    setMonthKey(toMonthKey(value));
  }

  async function saveRecord() {
    setSaving(true);
    setMessage("");

    const payload: CheckinRecord = {
      ...form,
      user_id: user.id,
      score: score.total,
      score_detail: score,
    };

    const { error } = await supabase.from("checkin_records").upsert(payload, {
      onConflict: "user_id,record_date",
    });

    if (error) {
      setMessage(formatDataError(error.message));
    } else {
      setMessage("已保存。");
      await loadMonth();
    }

    setSaving(false);
  }

  async function deleteRecord(record: CheckinRecord) {
    const confirmed = window.confirm(`删除 ${formatCnDate(record.record_date)} 的打卡记录？`);
    if (!confirmed) return;

    const { error } = await supabase.from("checkin_records").delete().eq("id", record.id);
    if (error) {
      setMessage(formatDataError(error.message));
    } else {
      setMessage("已删除。");
      await loadMonth();
    }
  }

  async function exportAllCsv() {
    const { data, error } = await supabase.from("checkin_records").select("*").order("record_date", { ascending: true });
    if (error) {
      setMessage(formatDataError(error.message));
      return;
    }
    downloadCsv((data ?? []) as CheckinRecord[]);
  }

  const isEditingSection = ["health", "habits", "tasks", "finance"].includes(view);

  return (
    <main className="app-shell compact-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">每日打卡</p>
          <h1>今日状态</h1>
          <p className="muted">记录健康、习惯、任务和财务</p>
        </div>

        <button className="sidebar-score" onClick={() => setView("score")}>
          <span>今日评分</span>
          <strong>{score.total}</strong>
        </button>

        <nav className="side-nav" aria-label="主导航">
          <NavButton active={view === "today" || isEditingSection} onClick={() => setView("today")} icon={CalendarDays} label="今日填写" />
          <NavButton active={view === "score"} onClick={() => setView("score")} icon={ClipboardList} label="今日评分" />
          <NavButton active={view === "history"} onClick={() => setView("history")} icon={History} label="历史记录" />
          <NavButton active={view === "trend"} onClick={() => setView("trend")} icon={BarChart3} label="趋势分析" />
        </nav>

        <div className="month-switcher">
          <button aria-label="上个月" onClick={() => setMonthKey((month) => shiftMonth(month, -1))}>
            <ChevronLeft size={18} />
          </button>
          <strong>{monthKey}</strong>
          <button aria-label="下个月" onClick={() => setMonthKey((month) => shiftMonth(month, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>

        <button className="secondary-button" onClick={exportAllCsv}>
          <Download size={17} />
          导出 CSV
        </button>
        <button className="ghost-button" onClick={() => supabase.auth.signOut()}>
          <LogOut size={17} />
          退出登录
        </button>
      </aside>

      <section className="content-panel wide-panel mobile-section active">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{viewTitle(view)}</p>
            <h2>
              {formatCnDate(selectedDate)} 周{getWeekday(selectedDate)}
            </h2>
          </div>
          <label className="date-input">
            日期
            <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
          </label>
        </div>

        <div className="score-strip">
          <div>
            <span>今日评分</span>
            <strong>{score.total}</strong>
          </div>
          <p>{score.missing.length > 0 ? `待补充：${score.missing.join("、")}` : "今日记录完整"}</p>
        </div>

        {message ? <StatusMessage message={message} /> : null}

        {view === "today" ? <TodayHub onOpen={setView} /> : null}
        {view === "health" ? <HealthForm form={form} update={update} sleepStart={sleepStart} /> : null}
        {view === "habits" ? <HabitsForm form={form} update={update} /> : null}
        {view === "tasks" ? <TasksForm form={form} update={update} /> : null}
        {view === "finance" ? <FinanceForm form={form} update={update} /> : null}
        {view === "score" ? <ScorePanel score={score} /> : null}
        {view === "history" ? (
          <HistoryPanel records={records} monthKey={monthKey} loading={loading} onDateChange={onDateChange} onDelete={deleteRecord} />
        ) : null}
        {view === "trend" ? <TrendPanel stats={stats} trendPoints={trendPoints} /> : null}

        {isEditingSection ? (
          <div className="action-row">
            <button className="primary-button" onClick={saveRecord} disabled={saving}>
              <Save size={17} />
              {saving ? "保存中..." : "保存记录"}
            </button>
            <button className="secondary-inline-button" onClick={() => setView("today")}>
              <ArrowLeft size={17} />
              返回今日填写
            </button>
          </div>
        ) : null}
      </section>

      <nav className="bottom-nav" aria-label="移动端导航">
        <NavButton active={view === "today" || isEditingSection} onClick={() => setView("today")} icon={CalendarDays} label="填写" />
        <NavButton active={view === "score"} onClick={() => setView("score")} icon={ClipboardList} label="评分" />
        <NavButton active={view === "history"} onClick={() => setView("history")} icon={History} label="历史" />
        <NavButton active={view === "trend"} onClick={() => setView("trend")} icon={BarChart3} label="趋势" />
      </nav>
    </main>
  );
}

function TodayHub({ onOpen }: { onOpen: (view: View) => void }) {
  return (
    <div className="section-grid">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <button key={section.view} className="section-entry" onClick={() => onOpen(section.view)}>
            <Icon size={24} />
            <span>{section.title}</span>
            <small>{section.desc}</small>
          </button>
        );
      })}
    </div>
  );
}

function HealthForm({ form, update, sleepStart }: { form: CheckinFormValues; update: UpdateForm; sleepStart: string }) {
  return (
    <form className="checkin-form">
      <NumberField label="睡眠/h" value={form.sleep_hours} onChange={(value) => update("sleep_hours", value)} step="0.1" />
      <label>
        起床时间
        <input type="time" value={form.wake_time ?? ""} onChange={(event) => update("wake_time", event.target.value || null)} />
      </label>
      <ReadOnlyField label="推算入睡时间" value={sleepStart || "填写睡眠和起床后自动计算"} />
      <SelectField label="运动项目" value={form.exercise_type ?? ""} onChange={(value) => update("exercise_type", value)} options={exerciseOptions} />
      <NumberField label="运动时长/mins" value={form.exercise_minutes} onChange={(value) => update("exercise_minutes", value)} />
      <NumberField label="步数" value={form.steps} onChange={(value) => update("steps", value)} />
      <NumberField label="体重/kg" value={form.weight_kg} onChange={(value) => update("weight_kg", value)} step="0.1" />
      <NumberField label="体脂率/%" value={form.body_fat_pct} onChange={(value) => update("body_fat_pct", value)} step="0.1" />
      <NumberField label="目标体重/kg" value={form.target_weight_kg} onChange={(value) => update("target_weight_kg", value)} step="0.1" />
      <NumberField label="洗漱护理 0-2" value={form.hygiene_score} onChange={(value) => update("hygiene_score", value)} max={2} />
      <NumberField label="饮食执行 0-2" value={form.diet_score} onChange={(value) => update("diet_score", value)} max={2} />
      <label className="wide">
        饮食记录
        <textarea value={form.diet_notes ?? ""} onChange={(event) => update("diet_notes", event.target.value)} rows={4} />
      </label>
      <label className="wide">
        一日凝练
        <textarea value={form.daily_summary ?? ""} onChange={(event) => update("daily_summary", event.target.value)} rows={3} />
      </label>
    </form>
  );
}

function HabitsForm({ form, update }: { form: CheckinFormValues; update: UpdateForm }) {
  return (
    <form className="checkin-form">
      <NumberField label="情绪失控次数" value={form.emotional_control} onChange={(value) => update("emotional_control", value)} />
      <NumberField label="冲动消费次数" value={form.impulse_spending} onChange={(value) => update("impulse_spending", value)} />
      <NumberField label="生活失控次数" value={form.life_discipline} onChange={(value) => update("life_discipline", value)} />
      <label className="wide">
        冲动消费复盘
        <textarea
          value={form.impulse_spending_note ?? ""}
          onChange={(event) => update("impulse_spending_note", event.target.value)}
          rows={5}
          placeholder="记录触发原因、当时状态、是否可替代，而不是只看金额。"
        />
      </label>
    </form>
  );
}

function TasksForm({ form, update }: { form: CheckinFormValues; update: UpdateForm }) {
  return (
    <form className="checkin-form">
      <label className="wide">
        今日应完成任务
        <textarea value={form.planned_tasks ?? ""} onChange={(event) => update("planned_tasks", event.target.value)} rows={5} />
      </label>
      <label className="wide">
        已完成任务
        <textarea value={form.completed_tasks ?? ""} onChange={(event) => update("completed_tasks", event.target.value)} rows={5} />
      </label>
      <NumberField label="任务完成率 0-1" value={form.task_completion} onChange={(value) => update("task_completion", value)} step="0.05" max={1} />
      <label className="wide">
        明日任务推荐
        <textarea value={form.tomorrow_tasks ?? ""} onChange={(event) => update("tomorrow_tasks", event.target.value)} rows={5} />
      </label>
      <label className="wide">
        复盘规划与第二天安排
        <textarea value={form.review_plan ?? ""} onChange={(event) => update("review_plan", event.target.value)} rows={5} />
      </label>
    </form>
  );
}

function FinanceForm({ form, update }: { form: CheckinFormValues; update: UpdateForm }) {
  const expenseTotal =
    (form.expense_food ?? 0) + (form.expense_transport ?? 0) + (form.expense_shopping ?? 0) + (form.expense_other ?? 0);

  return (
    <form className="checkin-form">
      <NumberField label="收入" value={form.income_amount} onChange={(value) => update("income_amount", value)} step="0.01" />
      <NumberField label="餐饮支出" value={form.expense_food} onChange={(value) => update("expense_food", value)} step="0.01" />
      <NumberField label="交通支出" value={form.expense_transport} onChange={(value) => update("expense_transport", value)} step="0.01" />
      <NumberField label="购物支出" value={form.expense_shopping} onChange={(value) => update("expense_shopping", value)} step="0.01" />
      <NumberField label="其他支出" value={form.expense_other} onChange={(value) => update("expense_other", value)} step="0.01" />
      <ReadOnlyField label="支出合计" value={expenseTotal.toFixed(2)} />
      <label className="wide">
        财务统计与复盘
        <textarea value={form.finance_review ?? ""} onChange={(event) => update("finance_review", event.target.value)} rows={6} />
      </label>
    </form>
  );
}

function ScorePanel({ score }: { score: ReturnType<typeof calculateScore> }) {
  return (
    <div className="score-detail standalone">
      <p className="scoring-note">
        评分不再依赖主观三档自评，改为行为证据优先：睡眠、起床、运动、步数、任务、复盘和财务记录按完成度给分；情绪、冲动消费、生活节制按事件次数扣分，并鼓励记录触发原因。
      </p>
      {score.items.map((item) => (
        <div key={item.key} className="score-row">
          <span>{item.label}</span>
          <strong>
            {item.earned}/{item.max}
          </strong>
          <small>{item.reason}</small>
        </div>
      ))}
    </div>
  );
}

function HistoryPanel({
  records,
  monthKey,
  loading,
  onDateChange,
  onDelete,
}: {
  records: CheckinRecord[];
  monthKey: string;
  loading: boolean;
  onDateChange: (date: string) => void;
  onDelete: (record: CheckinRecord) => void;
}) {
  return (
    <section>
      <div className="panel-heading subheading">
        <h3>{monthKey}</h3>
        <span className="count-pill">{loading ? "加载中" : `${records.length} 天`}</span>
      </div>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>评分</th>
              <th>体重</th>
              <th>体脂</th>
              <th>运动</th>
              <th>步数</th>
              <th>任务</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id ?? record.record_date}>
                <td>
                  <button className="link-button" onClick={() => onDateChange(record.record_date)}>
                    {formatCnDate(record.record_date)}
                  </button>
                </td>
                <td>{record.score}</td>
                <td>{record.weight_kg ?? "-"}</td>
                <td>{record.body_fat_pct ?? "-"}</td>
                <td>{record.exercise_minutes ?? "-"}</td>
                <td>{record.steps ?? "-"}</td>
                <td>{record.task_completion ?? "-"}</td>
                <td>
                  <button className="icon-button" aria-label="删除记录" onClick={() => onDelete(record)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 ? (
              <tr>
                <td colSpan={8}>本月暂无记录。</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TrendPanel({ stats, trendPoints }: { stats: ReturnType<typeof calculateMonthStats>; trendPoints: ReturnType<typeof buildTrendPoints> }) {
  return (
    <div className="trend-content">
      <div className="stat-grid">
        <Metric label="平均分" value={stats.averageScore} />
        <Metric label="打卡天数" value={stats.checkinDays} />
        <Metric label="80分以上" value={stats.goodDays} />
        <Metric label="最新体重" value={stats.latestWeight ?? "-"} />
      </div>
      <section className="chart-block">
        <h3>评分趋势</h3>
        <MiniChart data={trendPoints} kind="score" />
      </section>
      <section className="chart-block">
        <h3>体重 / 7日均重 / 目标线</h3>
        <MiniChart data={trendPoints} kind="weight" />
      </section>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof CalendarDays;
  label: string;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <Icon size={18} />
      {label}
    </button>
  );
}

function StatusMessage({ message }: { message: string }) {
  const isError = message.includes("数据") || message.includes("失败") || message.includes("权限") || message.includes("无法");

  return (
    <div className={isError ? "status-message error" : "status-message success"}>
      <strong>{isError ? "需要处理" : "状态"}</strong>
      <span>{message}</span>
    </div>
  );
}

function formatDataError(message: string) {
  if (message.includes("checkin_records") || message.includes("schema cache")) {
    return "数据表尚未创建或字段未同步。请在 Supabase SQL Editor 执行仓库中的 supabase/schema.sql，然后刷新页面。";
  }

  if (message.toLowerCase().includes("row-level security") || message.includes("permission denied")) {
    return "当前账号暂时无法访问数据。请重新登录，或检查数据库权限设置。";
  }

  return `操作失败：${message}`;
}

function NumberField({
  label,
  value,
  onChange,
  step = "1",
  max,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  step?: string;
  max?: number;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value ?? ""}
        step={step}
        min="0"
        max={max}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">未选择</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label>
      {label}
      <input value={value} readOnly />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function viewTitle(view: View) {
  const titleMap: Record<View, string> = {
    today: "今日填写",
    health: "健康生活",
    habits: "习惯养成",
    tasks: "每日任务",
    finance: "财务统计",
    score: "今日评分",
    history: "历史记录",
    trend: "趋势分析",
  };
  return titleMap[view];
}

function recordToForm(record: CheckinRecord): CheckinFormValues {
  return {
    record_date: record.record_date,
    sleep_hours: record.sleep_hours,
    wake_time: record.wake_time?.slice(0, 5) ?? null,
    exercise_type: record.exercise_type ?? "",
    exercise_minutes: record.exercise_minutes,
    steps: record.steps,
    weight_kg: record.weight_kg,
    target_weight_kg: record.target_weight_kg,
    body_fat_pct: record.body_fat_pct,
    life_discipline: record.life_discipline,
    impulse_spending: record.impulse_spending,
    impulse_spending_note: record.impulse_spending_note ?? "",
    emotional_control: record.emotional_control,
    hygiene_score: record.hygiene_score,
    diet_score: record.diet_score,
    diet_notes: record.diet_notes ?? "",
    task_completion: record.task_completion,
    planned_tasks: record.planned_tasks ?? "",
    completed_tasks: record.completed_tasks ?? "",
    tomorrow_tasks: record.tomorrow_tasks ?? "",
    income_amount: record.income_amount,
    expense_food: record.expense_food,
    expense_transport: record.expense_transport,
    expense_shopping: record.expense_shopping,
    expense_other: record.expense_other,
    review_plan: record.review_plan ?? "",
    finance_review: record.finance_review ?? "",
    daily_summary: record.daily_summary ?? "",
  };
}
