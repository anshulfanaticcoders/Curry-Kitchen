"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlanPerformance, RevenuePoint } from "@/lib/types";

const planColors = ["#f5b544", "#254c3a", "#bd4d2f", "#efb7a1"];

export function AdminCharts({
  revenueData,
  planPerformance,
}: {
  revenueData: RevenuePoint[];
  planPerformance: PlanPerformance[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <div className="mb-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-masala">
            Weekly trend
          </p>
          <h2 className="mt-2 font-display text-3xl font-black">Orders and revenue</h2>
        </div>
        <div className="overflow-x-auto">
          <AreaChart width={720} height={320} data={revenueData}>
              <defs>
                <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f5b544" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#f5b544" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(24,32,28,0.08)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
              <Tooltip
                contentStyle={{
                  border: "1px solid rgba(24,32,28,0.12)",
                  borderRadius: 8,
                  boxShadow: "0 18px 36px rgba(24, 32, 28, 0.12)",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#bd4d2f"
                strokeWidth={3}
                fill="url(#revenueFill)"
              />
          </AreaChart>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <div className="mb-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-masala">
            Plan mix
          </p>
          <h2 className="mt-2 font-display text-3xl font-black">Active package share</h2>
        </div>
        <div className="overflow-x-auto">
          <PieChart width={360} height={320}>
              <Pie data={planPerformance} dataKey="value" nameKey="name" innerRadius={72} outerRadius={112} paddingAngle={3}>
                {planPerformance.map((entry, index) => (
                  <Cell key={entry.name} fill={planColors[index % planColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  border: "1px solid rgba(24,32,28,0.12)",
                  borderRadius: 8,
                  boxShadow: "0 18px 36px rgba(24, 32, 28, 0.12)",
                }}
              />
          </PieChart>
        </div>
      </section>
    </div>
  );
}
