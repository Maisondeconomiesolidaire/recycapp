import type { ReactNode } from "react";
import { useState } from "react";
import { useThemeContext } from "../../components/crm/CrmLayout";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Inbox,
  Trophy,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "../../components/crm/PageHeader";
import { FullSpinner } from "../../components/ui/Spinner";
import {
  REQUEST_TYPES,
  STAGES,
  TYPE_COLORS,
  TYPE_LABELS,
} from "../../lib/constants";

type StatsType = "aerogommage" | "collecte" | "article" | "velo" | null;

function StatsTypeSelect({
  value,
  onChange,
}: {
  value: StatsType;
  onChange: (v: StatsType) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange((e.target.value as StatsType) || null)}
      className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
    >
      <option value="">Tous les types</option>
      {REQUEST_TYPES.map((t) => (
        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
      ))}
    </select>
  );
}

export function Dashboard() {
  const [statsType, setStatsType] = useState<StatsType>(null);
  const stats = useQuery(api.dashboard.stats, statsType ? { type: statsType } : {});
  const isDark = useThemeContext();
  const chartTick = isDark ? "#a1a1aa" : "#52525b";
  const chartGrid = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  if (stats === undefined) {
    return (
      <div>
        <PageHeader title="Tableau de bord" />
        <div className="p-6">
          <FullSpinner label="Chargement…" />
        </div>
      </div>
    );
  }

  const winRate = stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0;
  const activeRate =
    stats.total > 0 ? Math.round((stats.open / stats.total) * 100) : 0;
  const completionRate =
    stats.open > 0
      ? Math.max(0, Math.round(((stats.open - stats.incomplete) / stats.open) * 100))
      : 100;

  const typeData = REQUEST_TYPES.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    value: stats.byType[type] ?? 0,
    color: TYPE_COLORS[type],
  }));

  const totalTypeVolume = typeData.reduce((sum, item) => sum + item.value, 0);
  const stageData = STAGES.map((stage) => ({
    label: stage.label.replace(" client", ""),
    value: stats.byStage[stage.key] ?? 0,
    fullLabel: stage.label,
  }));

  const healthSegments = [
    {
      key: "open",
      label: "En cours",
      value: stats.open,
      color: "#38bdf8",
    },
    {
      key: "won",
      label: "Gagnées",
      value: stats.won,
      color: "#ff7700",
    },
    {
      key: "lost",
      label: "Perdues",
      value: stats.lost,
      color: "#f87171",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
      />

      <div className="p-4 sm:p-6">
        <div className="space-y-6">
          <section className="p-1">
            <div className="grid gap-6 xl:grid-cols-[1.18fr_1fr]">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <StatCard
                    label="Demandes actives"
                    value={stats.open}
                    helper={`${activeRate}% du volume total`}
                    flat
                  />
                  <StatCard
                    label="Planifiées aujourd'hui"
                    value={stats.scheduledToday}
                    helper="Vue opérationnelle immédiate"
                    flat
                  />
                  <StatCard
                    label="Taux de complétude"
                    value={`${completionRate}%`}
                    helper={`${stats.incomplete} demande(s) à compléter`}
                    flat
                  />
                  <StatCard
                    label="Taux de gain"
                    value={`${winRate}%`}
                    helper={`${stats.won} gagnée(s) / ${stats.lost} perdue(s)`}
                    flat
                  />
                </div>
              </div>

              <Panel flat>
                <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
                  <div className="mx-auto h-40 w-40 lg:h-44 lg:w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius="68%"
                        outerRadius="100%"
                        barSize={14}
                        data={[
                          {
                            name: "Taux de gain",
                            value: winRate,
                            fill: "#ff7700",
                          },
                        ]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          background={{ fill: "rgba(255,255,255,0.08)" }}
                          dataKey="value"
                          cornerRadius={999}
                        />
                        <text
                          x="50%"
                          y="46%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-zinc-100 text-[28px] font-semibold"
                        >
                          {winRate}%
                        </text>
                        <text
                          x="50%"
                          y="60%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-zinc-500 text-[11px]"
                        >
                          conversion
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="min-w-0">
                    <div className="overflow-hidden p-1">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-zinc-200">
                          Répartition des demandes
                        </p>
                        <p className="text-xs text-zinc-500">
                          {stats.total} au total
                        </p>
                      </div>

                      <div className="flex h-28 overflow-hidden rounded-[20px] bg-[var(--crm-surface)]">
                        {healthSegments.map((segment) => {
                          const width =
                            stats.total > 0 ? (segment.value / stats.total) * 100 : 0;
                          if (width === 0) return null;

                          return (
                            <div
                              key={segment.key}
                              className="flex min-w-[88px] flex-col justify-end gap-1 px-4 py-3"
                              style={{
                                width: `${width}%`,
                                backgroundColor: segment.color,
                              }}
                            >
                              <span className="text-4xl font-bold leading-none text-white">
                                {segment.value}
                              </span>
                              <span className="text-xs font-medium text-white/90">
                                {segment.label}
                              </span>
                            </div>
                          );
                        })}
                        {stats.total === 0 && (
                          <div className="flex w-full items-center justify-center text-sm text-zinc-500">
                            Aucune demande
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </Panel>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel
              title="Répartition par type"
              subtitle="Poids de chaque activité dans le volume des demandes"
            >
              <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={72}
                        outerRadius={108}
                        paddingAngle={3}
                        stroke={isDark ? "rgba(24,24,27,0.9)" : "rgba(244,244,245,0.9)"}
                        strokeWidth={6}
                      >
                        {typeData.map((entry) => (
                          <Cell key={entry.type} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <text
                        x="50%"
                        y="47%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-zinc-100 text-[28px] font-semibold"
                      >
                        {stats.total}
                      </text>
                      <text
                        x="50%"
                        y="60%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-zinc-500 text-[11px]"
                      >
                        demandes
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {typeData.map((item) => {
                    const share =
                      totalTypeVolume > 0
                        ? Math.round((item.value / totalTypeVolume) * 100)
                        : 0;
                    return (
                      <div
                        key={item.type}
                        className="rounded-2xl border border-[var(--crm-border)] bg-white/[0.03] p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full shadow-[0_0_16px_currentColor]"
                              style={{ backgroundColor: item.color, color: item.color }}
                            />
                            <div>
                              <p className="text-sm font-medium text-zinc-100">
                                {item.label}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {share}% des demandes
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-semibold text-zinc-100">{item.value}</p>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[var(--crm-surface-3)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              background: `linear-gradient(90deg, ${item.color}, ${item.color}aa)`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>

            <Panel
              title="Pipeline actif"
              action={
                <div className="flex items-center gap-3">
                  <StatsTypeSelect value={statsType} onChange={setStatsType} />
                  <Link
                    to="/crm/demandes"
                    className="inline-flex items-center gap-1 text-sm text-brand-300 transition hover:text-brand-200"
                  >
                    Voir le détail
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              }
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                    <CartesianGrid vertical={false} stroke={chartGrid} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: chartTick, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: chartTick, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#ff7700" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-5 grid gap-3">
                {stageData.map((stage, index) => (
                  <div
                    key={stage.fullLabel}
                    className="flex items-center justify-between rounded-2xl border border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-bg)_78%,transparent)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-zinc-300">
                        0{index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          {stage.fullLabel}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {stats.open > 0
                            ? `${Math.round((stage.value / stats.open) * 100)}% des dossiers actifs`
                            : "Aucun dossier actif"}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-zinc-100">{stage.value}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <Panel
              title="Lecture de performance"
              action={<StatsTypeSelect value={statsType} onChange={setStatsType} />}
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { label: "Actives", value: stats.open },
                      { label: "Gagnées", value: stats.won },
                      { label: "Perdues", value: stats.lost },
                      { label: "Incomplètes", value: stats.incomplete },
                    ]}
                    margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dashboardArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff7700" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#ff7700" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={chartGrid} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: chartTick, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: chartTick, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={false} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#ff7700"
                      strokeWidth={3}
                      fill="url(#dashboardArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              title="Points d'attention"
              subtitle="Ce qui mérite un regard rapide aujourd'hui"
              action={<StatsTypeSelect value={statsType} onChange={setStatsType} />}
            >
              <div className="space-y-3">
                <InsightCard
                  title="Demandes incomplètes"
                  value={stats.incomplete}
                  description="Identifier les dossiers qui bloquent le traitement commercial."
                  icon={<AlertTriangle className="h-4 w-4" />}
                  tone="text-amber-300 bg-amber-500/15 border-amber-500/20"
                />
                <InsightCard
                  title="Demandes à traiter"
                  value={stats.open}
                  description="Le volume actuellement actif donne le rythme de l'équipe."
                  icon={<Inbox className="h-4 w-4" />}
                  tone="text-sky-300 bg-sky-500/15 border-sky-500/20"
                />
                <InsightCard
                  title="Taux de gain"
                  value={`${winRate}%`}
                  description="Indicateur global de conversion du portefeuille enregistré."
                  icon={<Trophy className="h-4 w-4" />}
                  tone="text-brand-200 bg-brand-500/15 border-brand-500/20"
                />
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  flat = false,
}: {
  label: string;
  value: number | string;
  helper: string;
  flat?: boolean;
}) {
  return (
    <div
      className={
        flat
          ? "p-4"
          : "rounded-3xl border border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-bg)_72%,transparent)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      }
    >
      <p className="text-4xl font-semibold tracking-tight text-zinc-100">
        {value}
      </p>
      <p className="mt-3 text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function InsightCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className={`rounded-3xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {title}
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">{description}</p>
        </div>
        <p className="text-2xl font-semibold text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  className = "",
  flat = false,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  flat?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        flat
          ? `p-1 ${className}`
          : `rounded-[28px] border border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-surface)_92%,transparent)] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.18)] ${className}`
      }
    >
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold text-zinc-100">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; payload?: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-bg)_94%,transparent)] px-3 py-2 shadow-2xl backdrop-blur">
      {label ? <p className="mb-2 text-xs font-medium text-zinc-400">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((item, index) => {
          const tone = typeof item.payload?.color === "string" ? item.payload.color : "#ff7700";
          const entryLabel =
            typeof item.payload?.label === "string"
              ? item.payload.label
              : item.name ?? "Valeur";

          return (
            <div key={`${entryLabel}-${index}`} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: tone }}
              />
              <span className="text-zinc-300">{entryLabel}</span>
              <span className="ml-auto font-medium text-white">{item.value ?? 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
