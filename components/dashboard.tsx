"use client";

import { MiniChart } from "@/components/mini-chart";
import { TodayCheckin } from "@/components/today-checkin";
import { formatCnDate, getMonthRange, getWeekday, shiftMonth, toLocalDateString, toMonthKey } from "@/lib/date";
import { downloadCsv } from "@/lib/export";
import { calculateScore } from "@/lib/scoring";
import { buildTrendPoints, calculateMonthStats } from "@/lib/stats";
import type { CheckinFormValues, CheckinRecord } from "@/lib/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  History,
  LogOut,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type View = "today" | "score" | "history" | "trend";

const emptyForm = (date = toLocalDateString()): CheckinFormValues => ({
  record_date: date,
  sleep_hours: null,
  wake_time: null,
  exercise_type: "",
  exercise_minutes: null,
  steps: null,
  weight_kg: null,
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

export function Dashboard({ supabase, user }: { supabase: SupabaseClient; user: User }) {
  const [selectedDate, setSelectedDate] = useState(toLocalDateString());
  const [monthKey, setMonthKey] = useState(toMonthKey(toLocalDateString()));
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [previousRecord, setPreviousRecord] = useState<CheckinRecord | null>(null);
  const [form, setForm] = useState<CheckinFormValues>(() => emptyForm(selectedDate));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<View>("today");

  const score = useMemo(() => calculateScore(form), [form]);
  const trendPoints = useMemo(() => buildTrendPoints(records), [records]);
  const stats = useMemo(() => calculateMonthStats(records), [records]);

  const loadMonth = useCallback(async (clearMessage = true) => {
    setLoading(true);
    if (clearMessage) {
      setMessage("");
    }

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

  useEffect(() => {
    let active = true;
    const previousDate = shiftDate(selectedDate, -1);

    async function loadPreviousRecord() {
      const cached = records.find((record) => record.record_date === previousDate);
      if (cached) {
        setPreviousRecord(cached);
        return;
      }

      const { data } = await supabase
        .from("checkin_records")
        .select("*")
        .eq("record_date", previousDate)
        .maybeSingle();

      if (active) {
        setPreviousRecord((data as CheckinRecord | null) ?? null);
      }
    }

    loadPreviousRecord();
    return () => {
      active = false;
    };
  }, [records, selectedDate, supabase]);

  function update<K extends keyof CheckinFormValues>(key: K, value: CheckinFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (message === "已保存。") {
      setMessage("");
    }
  }

  function onDateChange(value: string) {
    setSelectedDate(value);
    setMonthKey(toMonthKey(value));
  }

  async function saveRecord() {
    setSaving(true);
    setMessage("");

    try {
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
        await loadMonth(false);
      }
    } catch (error) {
      setMessage(formatDataError(error instanceof Error ? error.message : "未知错误"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record: CheckinRecord) {
    const confirmed = window.confirm(`删除 ${formatCnDate(record.record_date)} 的打卡记录？`);
    if (!confirmed) return;

    const { error } = await supabase.from("checkin_records").delete().eq("id", record.id);
    if (error) {
      setMessage(formatDataError(error.message));
    } else {
      setMessage("已删除。");
      await loadMonth(false);
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

  function openRecord(date: string) {
    onDateChange(date);
    setView("today");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-heading">
          <h1>每日打卡</h1>
          <p>少填一点，坚持久一点。</p>
        </div>

        <button className="sidebar-score" onClick={() => setView("score")}>
          <span>今日评分</span>
          <strong>{score.total}</strong>
        </button>

        <nav className="side-nav" aria-label="主导航">
          <NavButton active={view === "today"} onClick={() => setView("today")} icon={CalendarDays} label="今日打卡" />
          <NavButton active={view === "score"} onClick={() => setView("score")} icon={ClipboardList} label="评分明细" />
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

        <div className="sidebar-actions">
          <button className="secondary-button" onClick={exportAllCsv}>
            <Download size={17} />
            导出 CSV
          </button>
          <button className="ghost-button" onClick={() => supabase.auth.signOut()}>
            <LogOut size={17} />
            退出登录
          </button>
        </div>
      </aside>

      <section className="content-panel">
        <header className="workspace-header">
          <div>
            <p>{viewTitle(view)}</p>
            <h2>
              {formatCnDate(selectedDate)} 周{getWeekday(selectedDate)}
            </h2>
          </div>
          <label className="date-input">
            <span>切换日期</span>
            <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
          </label>
        </header>

        {message ? <StatusMessage message={message} /> : null}

        {view === "today" ? (
          <TodayCheckin
            form={form}
            previousRecord={previousRecord}
            score={score}
            saving={saving}
            onUpdate={update}
            onSave={saveRecord}
          />
        ) : null}
        {view === "score" ? <ScorePanel score={score} /> : null}
        {view === "history" ? (
          <HistoryPanel
            records={records}
            monthKey={monthKey}
            loading={loading}
            onDateChange={openRecord}
            onDelete={deleteRecord}
          />
        ) : null}
        {view === "trend" ? <TrendPanel stats={stats} trendPoints={trendPoints} /> : null}
      </section>

      <nav className="bottom-nav" aria-label="移动端导航">
        <NavButton active={view === "today"} onClick={() => setView("today")} icon={CalendarDays} label="打卡" />
        <NavButton active={view === "score"} onClick={() => setView("score")} icon={ClipboardList} label="评分" />
        <NavButton active={view === "history"} onClick={() => setView("history")} icon={History} label="历史" />
        <NavButton active={view === "trend"} onClick={() => setView("trend")} icon={BarChart3} label="趋势" />
      </nav>
    </main>
  );
}

function ScorePanel({ score }: { score: ReturnType<typeof calculateScore> }) {
  return (
    <section className="score-detail">
      <div className="score-summary">
        <strong>{score.total}</strong>
        <div>
          <h3>{scoreLabel(score.total)}</h3>
          <p>评分只看核心行为，体重、财务和文字复盘不直接计分。</p>
        </div>
      </div>
      <div className="score-list">
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
    </section>
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
      <div className="section-heading">
        <div>
          <h3>{monthKey}</h3>
          <p>点击日期可继续补充当天记录。</p>
        </div>
        <span className="count-label">{loading ? "加载中" : `${records.length} 天`}</span>
      </div>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>评分</th>
              <th>体重</th>
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
                <td>{record.exercise_minutes ? `${record.exercise_minutes} 分钟` : "-"}</td>
                <td>{record.steps ?? "-"}</td>
                <td>{formatCompletion(record.task_completion)}</td>
                <td>
                  <button className="icon-button" aria-label="删除记录" title="删除记录" onClick={() => onDelete(record)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 ? (
              <tr>
                <td colSpan={7}>本月暂无记录。</td>
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
        <div className="chart-heading">
          <h3>体重 / 7日均重</h3>
          <div className="chart-legend" aria-label="图例">
            <span>体重</span>
            <span className="legend-average">7日均重</span>
          </div>
        </div>
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
      <strong>{isError ? "需要处理" : "已完成"}</strong>
      <span>{message}</span>
    </div>
  );
}

function formatDataError(message: string) {
  if (message.includes("Could not find") && message.includes("column")) {
    return "数据库字段尚未同步。请在 Supabase SQL Editor 执行 supabase/upgrade_20260609.sql，然后刷新页面。";
  }

  if (message.includes("checkin_records") || message.includes("schema cache")) {
    return "打卡数据表尚未初始化。请在 Supabase SQL Editor 执行 supabase/schema.sql，然后刷新页面。";
  }

  if (message.toLowerCase().includes("row-level security") || message.includes("permission denied")) {
    return "当前账号暂时无法访问数据。请重新登录，或检查数据库权限设置。";
  }

  return `操作失败：${message}`;
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
    today: "今日打卡",
    score: "评分明细",
    history: "历史记录",
    trend: "趋势分析",
  };
  return titleMap[view];
}

function scoreLabel(score: number) {
  if (score >= 85) return "状态很好";
  if (score >= 70) return "整体稳定";
  if (score >= 50) return "完成了关键部分";
  return "先记录，再调整";
}

function formatCompletion(value: number | null) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "-";
}

function shiftDate(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return toLocalDateString(value);
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
