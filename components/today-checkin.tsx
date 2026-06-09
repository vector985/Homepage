"use client";

import { calculateSleepStart } from "@/lib/scoring";
import type { CheckinFormValues, CheckinRecord, ScoreDetail } from "@/lib/types";
import {
  BedDouble,
  Check,
  ChevronDown,
  CircleDollarSign,
  Dumbbell,
  FileText,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import { useId, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

type UpdateForm = <K extends keyof CheckinFormValues>(key: K, value: CheckinFormValues[K]) => void;

const exerciseOptions = ["休息", "臀腿", "胸臂", "核心", "有氧", "拉伸"];

export function TodayCheckin({
  form,
  previousRecord,
  score,
  saving,
  onUpdate,
  onSave,
}: {
  form: CheckinFormValues;
  previousRecord: CheckinRecord | null;
  score: ScoreDetail;
  saving: boolean;
  onUpdate: UpdateForm;
  onSave: () => void;
}) {
  const sleepStart = useMemo(
    () => calculateSleepStart(form.wake_time, form.sleep_hours),
    [form.sleep_hours, form.wake_time],
  );

  return (
    <div className="today-workspace">
      <div className="today-score-line">
        <div>
          <span>今日评分</span>
          <strong>{score.total}</strong>
        </div>
        <p>先完成核心记录，其他内容需要时再展开。</p>
        <button className="primary-button quick-save-button" onClick={onSave} disabled={saving}>
          <Save size={17} />
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      <section className="checkin-section">
        <SectionHeading icon={BedDouble} title="快速记录" description="睡眠、身体和运动，通常一分钟内完成。" />
        <div className="quick-record-grid">
          <NumberField
            label="睡眠"
            suffix="小时"
            value={form.sleep_hours}
            step="0.1"
            onChange={(value) => onUpdate("sleep_hours", value)}
            quickValues={[6.5, 7, 7.5, 8]}
          />
          <TimeField label="起床" value={form.wake_time} onChange={(value) => onUpdate("wake_time", value)} />
          <ReadOnlyField label="推算入睡" value={sleepStart || "--:--"} />
          <NumberField
            label="体重"
            suffix="kg"
            value={form.weight_kg}
            step="0.1"
            onChange={(value) => onUpdate("weight_kg", value)}
          />
          <NumberField
            label="体脂"
            suffix="%"
            value={form.body_fat_pct}
            step="0.1"
            onChange={(value) => onUpdate("body_fat_pct", value)}
          />
          <NumberField label="步数" value={form.steps} onChange={(value) => onUpdate("steps", value)} />
        </div>

        <div className="exercise-block">
          <div className="inline-control-label">
            <Dumbbell size={18} />
            <span>运动</span>
          </div>
          <div className="field-control exercise-type-field">
            <span>运动项目</span>
            <SegmentedControl
              label="运动项目"
              value={form.exercise_type ?? ""}
              options={exerciseOptions.map((item) => ({ label: item, value: item }))}
              onChange={(value) => {
                onUpdate("exercise_type", value);
                if (value === "休息") {
                  onUpdate("exercise_minutes", 0);
                }
              }}
            />
          </div>
          <NumberField
            label="时长"
            suffix="分钟"
            value={form.exercise_minutes}
            onChange={(value) => onUpdate("exercise_minutes", value)}
            quickValues={[15, 30, 45]}
            compact
          />
        </div>

        <div className="behavior-row">
          <DefinedScore
            label="洗漱护理"
            value={form.hygiene_score}
            options={[
              { label: "未完成", value: 0 },
              { label: "基础完成", value: 1 },
              { label: "完整完成", value: 2 },
            ]}
            onChange={(value) => onUpdate("hygiene_score", value)}
          />
          <DefinedScore
            label="饮食执行"
            value={form.diet_score}
            options={[
              { label: "偏离计划", value: 0 },
              { label: "基本正常", value: 1 },
              { label: "按计划", value: 2 },
            ]}
            onChange={(value) => onUpdate("diet_score", value)}
          />
        </div>
      </section>

      <TaskChecklist form={form} previousRecord={previousRecord} onUpdate={onUpdate} />

      <section className="checkin-section">
        <SectionHeading icon={Sparkles} title="习惯状态" description="记录今天是否发生，不需要给自己主观打分。" />
        <div className="habit-grid">
          <HabitControl
            label="情绪控制"
            value={form.emotional_control}
            onChange={(value) => onUpdate("emotional_control", value)}
            labels={["稳定", "有波动", "明显失控"]}
          />
          <HabitControl
            label="冲动消费"
            value={form.impulse_spending}
            onChange={(value) => onUpdate("impulse_spending", value)}
            labels={["没有", "发生一次", "多次发生"]}
          />
          <HabitControl
            label="生活节制"
            value={form.life_discipline}
            onChange={(value) => onUpdate("life_discipline", value)}
            labels={["稳定", "偏离一次", "多次偏离"]}
          />
        </div>
      </section>

      <section className="checkin-section detail-section">
        <SectionHeading icon={ListChecks} title="详细记录" description="以下内容都可选，只在有必要时展开。" />
        <div className="detail-list">
          <DetailDisclosure icon={CircleDollarSign} title="财务统计">
            <div className="finance-summary">
              <FinanceMetric label="现有资金总额" value={calculateFundsTotal(form)} tone="primary" />
              <FinanceMetric label="今日支出" value={calculateExpenseTotal(form)} />
              <FinanceMetric label="今日净变动" value={(form.income_amount ?? 0) - calculateExpenseTotal(form)} />
            </div>
            <h4 className="detail-subtitle">现有资金</h4>
            <div className="finance-grid balance-grid">
              <NumberField label="现金" suffix="元" value={form.cash_balance} step="0.01" onChange={(value) => onUpdate("cash_balance", value)} />
              <NumberField label="银行卡" suffix="元" value={form.bank_balance} step="0.01" onChange={(value) => onUpdate("bank_balance", value)} />
              <NumberField label="支付宝" suffix="元" value={form.alipay_balance} step="0.01" onChange={(value) => onUpdate("alipay_balance", value)} />
              <NumberField label="微信" suffix="元" value={form.wechat_balance} step="0.01" onChange={(value) => onUpdate("wechat_balance", value)} />
              <NumberField label="投资账户" suffix="元" value={form.investment_balance} step="0.01" onChange={(value) => onUpdate("investment_balance", value)} />
              <NumberField label="负债" suffix="元" value={form.debt_amount} step="0.01" onChange={(value) => onUpdate("debt_amount", value)} />
            </div>
            <h4 className="detail-subtitle">今日收支</h4>
            <div className="finance-grid expense-grid">
              <NumberField label="收入" suffix="元" value={form.income_amount} step="0.01" onChange={(value) => onUpdate("income_amount", value)} />
              <NumberField label="固定支出" suffix="元" value={form.expense_fixed} step="0.01" onChange={(value) => onUpdate("expense_fixed", value)} />
              <NumberField label="餐饮" suffix="元" value={form.expense_food} step="0.01" onChange={(value) => onUpdate("expense_food", value)} />
              <NumberField label="交通" suffix="元" value={form.expense_transport} step="0.01" onChange={(value) => onUpdate("expense_transport", value)} />
              <NumberField label="购物" suffix="元" value={form.expense_shopping} step="0.01" onChange={(value) => onUpdate("expense_shopping", value)} />
              <NumberField label="医疗健康" suffix="元" value={form.expense_health} step="0.01" onChange={(value) => onUpdate("expense_health", value)} />
              <NumberField label="学习成长" suffix="元" value={form.expense_learning} step="0.01" onChange={(value) => onUpdate("expense_learning", value)} />
              <NumberField label="娱乐社交" suffix="元" value={form.expense_entertainment} step="0.01" onChange={(value) => onUpdate("expense_entertainment", value)} />
              <NumberField label="其他" suffix="元" value={form.expense_other} step="0.01" onChange={(value) => onUpdate("expense_other", value)} />
            </div>
            <TextAreaField
              label="财务备注"
              value={form.finance_review ?? ""}
              onChange={(value) => onUpdate("finance_review", value)}
              placeholder="只记录需要复盘的支出或收入。"
            />
          </DetailDisclosure>

          <DetailDisclosure icon={Utensils} title="饮食记录">
            <TextAreaField
              label="饮食记录"
              value={form.diet_notes ?? ""}
              onChange={(value) => onUpdate("diet_notes", value)}
              placeholder="例如：午餐正常，晚餐略多。"
            />
          </DetailDisclosure>

          <DetailDisclosure icon={Sparkles} title="异常复盘">
            <TextAreaField
              label="异常复盘"
              value={form.impulse_spending_note ?? ""}
              onChange={(value) => onUpdate("impulse_spending_note", value)}
              placeholder="记录冲动消费、情绪波动或生活失控的触发原因和可替代方案。"
            />
          </DetailDisclosure>

          <DetailDisclosure icon={FileText} title="今日复盘">
            <div className="detail-form-grid">
              <TextAreaField
                label="一句话总结"
                value={form.daily_summary ?? ""}
                onChange={(value) => onUpdate("daily_summary", value)}
                placeholder="今天最值得记住的一件事。"
              />
              <TextAreaField
                label="复盘与调整"
                value={form.review_plan ?? ""}
                onChange={(value) => onUpdate("review_plan", value)}
                placeholder="明天需要继续或改变什么？"
              />
            </div>
          </DetailDisclosure>

          <DetailDisclosure icon={ListChecks} title="明日计划">
            <TextAreaField
              label="明日任务"
              value={form.tomorrow_tasks ?? ""}
              onChange={(value) => onUpdate("tomorrow_tasks", value)}
              placeholder="每行一项，明天可一键带入。"
            />
          </DetailDisclosure>
        </div>
      </section>

      <div className="save-bar">
        <div>
          <strong>可以只填一部分</strong>
          <span>再次保存会更新同一天的记录。</span>
        </div>
        <button className="primary-button save-button" onClick={onSave} disabled={saving}>
          <Save size={18} />
          {saving ? "保存中..." : "保存今日记录"}
        </button>
      </div>
    </div>
  );
}

function TaskChecklist({
  form,
  previousRecord,
  onUpdate,
}: {
  form: CheckinFormValues;
  previousRecord: CheckinRecord | null;
  onUpdate: UpdateForm;
}) {
  const [newTask, setNewTask] = useState("");
  const tasks = parseLines(form.planned_tasks);
  const completed = new Set(parseLines(form.completed_tasks));
  const unfinishedFromPrevious = previousRecord
    ? parseLines(previousRecord.planned_tasks).filter((task) => !new Set(parseLines(previousRecord.completed_tasks)).has(task))
    : [];
  const carryTasks = previousRecord
    ? parseLines(previousRecord.tomorrow_tasks).length > 0
      ? parseLines(previousRecord.tomorrow_tasks)
      : unfinishedFromPrevious
    : [];

  function syncTasks(nextTasks: string[], nextCompleted: Set<string>) {
    const validCompleted = nextTasks.filter((task) => nextCompleted.has(task));
    onUpdate("planned_tasks", nextTasks.join("\n"));
    onUpdate("completed_tasks", validCompleted.join("\n"));
    onUpdate("task_completion", nextTasks.length > 0 ? validCompleted.length / nextTasks.length : null);
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    const task = newTask.trim();
    if (!task || tasks.includes(task)) return;
    syncTasks([...tasks, task], completed);
    setNewTask("");
  }

  function toggleTask(task: string) {
    const nextCompleted = new Set(completed);
    if (nextCompleted.has(task)) {
      nextCompleted.delete(task);
    } else {
      nextCompleted.add(task);
    }
    syncTasks(tasks, nextCompleted);
  }

  function removeTask(task: string) {
    const nextCompleted = new Set(completed);
    nextCompleted.delete(task);
    syncTasks(tasks.filter((item) => item !== task), nextCompleted);
  }

  function carryPreviousTasks() {
    const merged = [...tasks];
    for (const task of carryTasks) {
      if (!merged.includes(task)) merged.push(task);
    }
    syncTasks(merged, completed);
  }

  const completion = tasks.length > 0 ? Math.round((completed.size / tasks.length) * 100) : 0;

  return (
    <section className="checkin-section">
      <div className="section-heading task-heading">
        <SectionHeading icon={ListChecks} title="今日任务" description="勾选完成项，完成率自动计算。" />
        <strong className="task-progress">{completion}%</strong>
      </div>

      {tasks.length > 0 ? (
        <div className="task-list">
          {tasks.map((task) => {
            const isCompleted = completed.has(task);
            return (
              <div key={task} className={isCompleted ? "task-row completed" : "task-row"}>
                <button
                  type="button"
                  className="task-check"
                  aria-label={isCompleted ? `取消完成 ${task}` : `完成 ${task}`}
                  onClick={() => toggleTask(task)}
                >
                  {isCompleted ? <Check size={16} /> : null}
                </button>
                <span>{task}</span>
                <button type="button" className="task-delete" aria-label={`删除 ${task}`} title="删除任务" onClick={() => removeTask(task)}>
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-copy">今天还没有任务，添加最重要的几项即可。</p>
      )}

      <form className="task-add" onSubmit={addTask}>
        <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="添加一项任务" />
        <button type="submit" className="secondary-inline-button" disabled={!newTask.trim()}>
          <Plus size={17} />
          添加
        </button>
      </form>

      {carryTasks.length > 0 ? (
        <button type="button" className="carry-button" onClick={carryPreviousTasks}>
          <RotateCcw size={16} />
          带入昨日未完成或已安排任务
        </button>
      ) : null}
    </section>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BedDouble;
  title: string;
  description: string;
}) {
  return (
    <div className="section-title">
      <Icon size={19} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HabitControl({
  label,
  value,
  onChange,
  labels,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  labels: [string, string, string];
}) {
  return (
    <div className="habit-control">
      <strong>{label}</strong>
      <SegmentedControl
        label={label}
        value={value === null ? "" : String(Math.min(value, 2))}
        options={labels.map((item, index) => ({ label: item, value: String(index) }))}
        onChange={(next) => onChange(Number(next))}
      />
    </div>
  );
}

function DefinedScore({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number | null;
  options: Array<{ label: string; value: number }>;
  onChange: (value: number) => void;
}) {
  return (
    <div className="defined-score">
      <strong>{label}</strong>
      <SegmentedControl
        label={label}
        value={value === null ? "" : String(value)}
        options={options.map((item) => ({ label: item.label, value: String(item.value) }))}
        onChange={(next) => onChange(Number(next))}
      />
    </div>
  );
}

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
  step = "1",
  quickValues = [],
  compact = false,
}: {
  label: string;
  suffix?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  step?: string;
  quickValues?: number[];
  compact?: boolean;
}) {
  const id = useId();

  function updateValue(nextValue: string) {
    onChange(nextValue === "" ? null : Math.max(0, Number(nextValue)));
  }

  return (
    <div className={compact ? "field-control compact-field" : "field-control"}>
      <label htmlFor={id}>{label}</label>
      <div className="input-with-suffix">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value ?? ""}
          onChange={(event: ChangeEvent<HTMLInputElement>) => updateValue(event.target.value)}
        />
        {suffix ? <span>{suffix}</span> : null}
      </div>
      {quickValues.length > 0 ? (
        <div className="quick-value-row">
          {quickValues.map((item) => (
            <button key={item} type="button" className={value === item ? "active" : ""} onClick={() => onChange(item)}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) {
  const id = useId();
  return (
    <div className="field-control">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="time" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-control">
      <span>{label}</span>
      <div className="read-only-value">{value}</div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      {label}
      <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function DetailDisclosure({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Utensils;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="detail-disclosure">
      <summary>
        <span>
          <Icon size={18} />
          {title}
        </span>
        <ChevronDown size={18} />
      </summary>
      <div className="detail-content">{children}</div>
    </details>
  );
}

function FinanceMetric({ label, value, tone }: { label: string; value: number; tone?: "primary" }) {
  return (
    <div className={tone === "primary" ? "finance-metric primary" : "finance-metric"}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}

function calculateFundsTotal(values: CheckinFormValues) {
  return (
    (values.cash_balance ?? 0) +
    (values.bank_balance ?? 0) +
    (values.alipay_balance ?? 0) +
    (values.wechat_balance ?? 0) +
    (values.investment_balance ?? 0) -
    (values.debt_amount ?? 0)
  );
}

function calculateExpenseTotal(values: CheckinFormValues) {
  return (
    (values.expense_fixed ?? 0) +
    (values.expense_food ?? 0) +
    (values.expense_transport ?? 0) +
    (values.expense_shopping ?? 0) +
    (values.expense_health ?? 0) +
    (values.expense_learning ?? 0) +
    (values.expense_entertainment ?? 0) +
    (values.expense_other ?? 0)
  );
}

function formatCurrency(value: number) {
  return `¥${value.toFixed(2)}`;
}

function parseLines(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}
