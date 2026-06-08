"use client";

import type { TrendPoint } from "@/lib/types";

type ChartKind = "score" | "weight";

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
