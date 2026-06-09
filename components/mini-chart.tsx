"use client";

import type { FinanceCategoryTotal, TrendPoint } from "@/lib/types";

type ChartKind = "score" | "weight";
type BarKind = "exercise" | "expense";

export function MiniChart({ data, kind }: { data: TrendPoint[]; kind: ChartKind }) {
  const points = data
    .map((point, index) => ({
      index,
      value: kind === "score" ? point.score : point.weight,
      aux: kind === "weight" ? point.movingAverageWeight : null,
    }))
    .filter((point) => typeof point.value === "number");

  if (points.length < 2) {
    return <div className="empty-chart">数据不足</div>;
  }

  const values = points.flatMap((point) => [point.value, point.aux].filter((value): value is number => typeof value === "number"));
  const min = kind === "score" ? 0 : Math.min(...values) - 1;
  const max = kind === "score" ? 100 : Math.max(...values) + 1;
  const width = 320;
  const height = 150;
  const pad = 18;
  const x = (index: number) => pad + (index / Math.max(1, data.length - 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - min) / Math.max(1, max - min)) * (height - pad * 2);

  const line = points.map((point) => `${x(point.index)},${y(point.value as number)}`).join(" ");
  const averageLine = points
    .filter((point) => typeof point.aux === "number")
    .map((point) => `${x(point.index)},${y(point.aux as number)}`)
    .join(" ");

  return (
    <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={kind === "score" ? "评分趋势图" : "体重趋势图"}>
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} />
      <line x1={pad} x2={pad} y1={pad} y2={height - pad} />
      {averageLine ? <polyline className="average-line" points={averageLine} /> : null}
      <polyline className="main-line" points={line} />
      {points.map((point) => (
        <circle key={`${kind}-${point.index}`} cx={x(point.index)} cy={y(point.value as number)} r="3" />
      ))}
    </svg>
  );
}

export function MiniBarChart({ data, kind }: { data: TrendPoint[]; kind: BarKind }) {
  const bars = data
    .map((point, index) => ({
      index,
      label: point.label,
      value: kind === "exercise" ? point.exerciseMinutes ?? 0 : point.expenseTotal,
    }))
    .filter((point) => point.value > 0);

  if (bars.length === 0) {
    return <div className="empty-chart">数据不足</div>;
  }

  const width = 320;
  const height = 150;
  const pad = 18;
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  const slot = (width - pad * 2) / Math.max(1, data.length);
  const barWidth = Math.max(5, Math.min(20, slot * 0.62));
  const x = (index: number) => pad + index * slot + (slot - barWidth) / 2;
  const y = (value: number) => height - pad - (value / max) * (height - pad * 2);

  return (
    <svg className="mini-chart bar-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={kind === "exercise" ? "运动分钟柱状图" : "每日支出柱状图"}>
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} />
      <line x1={pad} x2={pad} y1={pad} y2={height - pad} />
      {bars.map((bar) => {
        const top = y(bar.value);
        return (
          <rect
            key={`${kind}-${bar.index}`}
            x={x(bar.index)}
            y={top}
            width={barWidth}
            height={height - pad - top}
            rx="3"
          />
        );
      })}
    </svg>
  );
}

export function MiniPieChart({ data }: { data: FinanceCategoryTotal[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return <div className="empty-chart">本月暂无支出分类</div>;
  }

  const size = 156;
  const center = size / 2;
  const radius = 58;
  let cursor = -90;

  return (
    <div className="pie-chart-wrap">
      <svg className="pie-chart" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="支出分类饼图">
        {data.map((item, index) => {
          const angle = (item.value / total) * 360;
          const path = describeArc(center, center, radius, cursor, cursor + angle);
          cursor += angle;
          return <path key={item.key} className={`pie-slice slice-${index % 8}`} d={path} />;
        })}
        <circle cx={center} cy={center} r="34" />
        <text x={center} y={center - 2} textAnchor="middle">
          支出
        </text>
        <text x={center} y={center + 17} textAnchor="middle">
          {formatMoney(total)}
        </text>
      </svg>
      <div className="pie-legend">
        {data.map((item, index) => (
          <span key={item.key}>
            <i className={`slice-${index % 8}`} />
            {item.label} {formatMoney(item.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  if (endAngle - startAngle >= 359.99) {
    return [
      `M ${cx} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
      `L ${cx} ${cy}`,
      "Z",
    ].join(" ");
  }

  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, "Z"].join(" ");
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function formatMoney(value: number) {
  return `¥${Math.round(value)}`;
}
