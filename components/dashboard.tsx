"use client";

import { calculateScore } from "@/lib/scoring";
import { downloadCsv } from "@/lib/export";
import { formatCnDate, getMonthRange, getWeekday, shiftMonth, toLocalDateString, toMonthKey } from "@/lib/date";
import { buildTrendPoints, calculateMonthStats } from "@/lib/stats";
import type { CheckinFormValues, CheckinRecord } from "@/lib/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  LogOut,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { MiniChart } from "@/components/mini-chart";

type MobileTab = "today" | "history" | "trend";

const emptyForm = (date = toLocalDateString()): CheckinFormValues => ({
  record_date: date,
  sleep_hours: null,
  wake_time: null,
  exercise_minutes: null,
  steps: null,
  weight_kg: null,
  target_weight_kg: null,
  life_discipline: null,
  impulse_spending: null,
  emotional_control: null,
  hygiene_score: null,
  diet_score: null,
  task_completion: null,
  review_plan: "",
  finance_review: "",
  daily_summary: "",
});

export function Dashboard({ supabase, user }: { supabase: SupabaseClient; user: User }) {
  const [selectedDate, setSelectedDate] = useState(toLocalDateString());
  const [monthKey, setMonthKey] = useState(toMonthKey(toLocalDateString()));
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [form, setForm] = useState<CheckinFormValues>(() => emptyForm(selectedDate));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("today");

  const score = useMemo(() => calculateScore(form), [form]);
  const trendPoints = useMemo(() => buildTrendPoints(records), [records]);
  const stats = useMemo(() => calculateMonthStats(records), [records]);

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
    const { data, error } = await supabase
      .from("checkin_records")
      .select("*")
      .order("record_date", { ascending: true });
    if (error) {
      setMessage(formatDataError(error.message));
      return;
    }
    downloadCsv((data ?? []) as CheckinRecord[]);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">每日打卡</p>
          <h1>减脂重启</h1>
          <p className="muted">从 2026-06-07 开始记录</p>
        </div>

        <nav className="side-nav" aria-label="主导航">
          <button className={mobileTab === "today" ? "active" : ""} onClick={() => setMobileTab("today")}>
            <CalendarDays size={18} />
            今日填写
          </button>
          <button className={mobileTab === "history" ? "active" : ""} onClick={() => setMobileTab("history")}>
            <History size={18} />
            历史记录
          </button>
          <button className={mobileTab === "trend" ? "active" : ""} onClick={() => setMobileTab("trend")}>
            <BarChart3 size={18} />
            趋势分析
          </button>
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

      <section className={`content-panel mobile-section ${mobileTab === "today" ? "active" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">今日填写</p>
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
          <p>{score.missing.length > 0 ? `未填写：${score.missing.join("、")}` : "核心项已填写完整"}</p>
        </div>

        {message ? <StatusMessage message={message} /> : null}

        <form className="checkin-form">
          <NumberField label="睡眠/h" value={form.sleep_hours} onChange={(value) => update("sleep_hours", value)} step="0.1" />
          <label>
            起床时间
            <input type="time" value={form.wake_time ?? ""} onChange={(event) => update("wake_time", event.target.value || null)} />
          </label>
          <NumberField label="运动时长/mins" value={form.exercise_minutes} onChange={(value) => update("exercise_minutes", value)} />
          <NumberField label="步数" value={form.steps} onChange={(value) => update("steps", value)} />
          <NumberField label="体重" value={form.weight_kg} onChange={(value) => update("weight_kg", value)} step="0.1" />
          <NumberField
            label="目标体重"
            value={form.target_weight_kg}
            onChange={(value) => update("target_weight_kg", value)}
            step="0.1"
          />
          <NumberField label="生活节制" value={form.life_discipline} onChange={(value) => update("life_discipline", value)} />
          <NumberField label="冲动消费" value={form.impulse_spending} onChange={(value) => update("impulse_spending", value)} />
          <NumberField label="情绪控制" value={form.emotional_control} onChange={(value) => update("emotional_control", value)} />
          <NumberField label="洗漱护理" value={form.hygiene_score} onChange={(value) => update("hygiene_score", value)} max={2} />
          <NumberField label="饮食评价" value={form.diet_score} onChange={(value) => update("diet_score", value)} max={2} />
          <NumberField
            label="任务情况"
            value={form.task_completion}
            onChange={(value) => update("task_completion", value)}
            step="0.1"
            max={1}
          />
          <label className="wide">
            复盘规划
            <textarea value={form.review_plan ?? ""} onChange={(event) => update("review_plan", event.target.value)} rows={3} />
          </label>
          <label className="wide">
            财务统计
            <textarea value={form.finance_review ?? ""} onChange={(event) => update("finance_review", event.target.value)} rows={3} />
          </label>
          <label className="wide">
            一日凝练
            <textarea value={form.daily_summary ?? ""} onChange={(event) => update("daily_summary", event.target.value)} rows={3} />
          </label>
        </form>

        <div className="action-row">
          <button className="primary-button" onClick={saveRecord} disabled={saving}>
            <Save size={17} />
            {saving ? "保存中..." : "保存到 Supabase"}
          </button>
        </div>
      </section>

      <section className={`history-panel mobile-section ${mobileTab === "history" ? "active" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">历史记录</p>
            <h2>{monthKey}</h2>
          </div>
          <span className="count-pill">{loading ? "加载中" : `${records.length} 天`}</span>
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
                  <td>{record.exercise_minutes ?? "-"}</td>
                  <td>{record.steps ?? "-"}</td>
                  <td>{record.task_completion ?? "-"}</td>
                  <td>
                    <button className="icon-button" aria-label="删除记录" onClick={() => deleteRecord(record)}>
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

      <aside className={`trend-panel mobile-section ${mobileTab === "trend" ? "active" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">趋势分析</p>
            <h2>月度概览</h2>
          </div>
        </div>

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

        <section className="score-detail">
          <h3>今日评分明细</h3>
          {score.items.map((item) => (
            <div key={item.key} className="score-row">
              <span>{item.label}</span>
              <strong>
                {item.earned}/{item.max}
              </strong>
              <small>{item.reason}</small>
            </div>
          ))}
        </section>
      </aside>

      <nav className="bottom-nav" aria-label="移动端导航">
        <button className={mobileTab === "today" ? "active" : ""} onClick={() => setMobileTab("today")}>
          <CalendarDays size={18} />
          今日
        </button>
        <button className={mobileTab === "history" ? "active" : ""} onClick={() => setMobileTab("history")}>
          <History size={18} />
          历史
        </button>
        <button className={mobileTab === "trend" ? "active" : ""} onClick={() => setMobileTab("trend")}>
          <BarChart3 size={18} />
          趋势
        </button>
      </nav>
    </main>
  );
}

function StatusMessage({ message }: { message: string }) {
  const isError = message.includes("数据库") || message.includes("失败") || message.includes("权限");

  return (
    <div className={isError ? "status-message error" : "status-message success"}>
      <strong>{isError ? "需要处理" : "状态"}</strong>
      <span>{message}</span>
    </div>
  );
}

function formatDataError(message: string) {
  if (message.includes("checkin_records") || message.includes("schema cache")) {
    return "数据库表尚未创建。请先在 Supabase SQL Editor 执行仓库中的 supabase/schema.sql，然后刷新页面。";
  }

  if (message.toLowerCase().includes("row-level security") || message.includes("permission denied")) {
    return "数据库权限被拒绝。请确认 Supabase 已启用并配置 checkin_records 的 RLS 策略。";
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
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
      />
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

function recordToForm(record: CheckinRecord): CheckinFormValues {
  return {
    record_date: record.record_date,
    sleep_hours: record.sleep_hours,
    wake_time: record.wake_time?.slice(0, 5) ?? null,
    exercise_minutes: record.exercise_minutes,
    steps: record.steps,
    weight_kg: record.weight_kg,
    target_weight_kg: record.target_weight_kg,
    life_discipline: record.life_discipline,
    impulse_spending: record.impulse_spending,
    emotional_control: record.emotional_control,
    hygiene_score: record.hygiene_score,
    diet_score: record.diet_score,
    task_completion: record.task_completion,
    review_plan: record.review_plan ?? "",
    finance_review: record.finance_review ?? "",
    daily_summary: record.daily_summary ?? "",
  };
}
