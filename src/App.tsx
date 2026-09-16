import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CallRecord = {
  id: string | number;
  callerName?: string;
  callerNumber?: string;
  receiverNumber?: string;
  city?: string;
  callDirection?: boolean | string;
  callStatus?: boolean | string;
  callDuration?: number | string;
  callCost?: number | string;
  callStartTime?: string;
  callEndTime?: string;
};

const API_URL = "https://69b30b45e224ec066bdb55a0.mockapi.io/api/v1/cdr";

const CHART_COLORS = [
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#0ea5e9",
  "#84cc16",
  "#f97316",
];

function isSuccessful(status: CallRecord["callStatus"]) {
  return status === true || status === "true" || status === "1";
}

function getDuration(call: CallRecord) {
  const value = Number(call.callDuration ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getCost(call: CallRecord) {
  const value = Number(call.callCost ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;

  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  iconClass: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-semibold ${iconClass}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
      No chart data available
    </div>
  );
}

export default function App() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let isActive = true;

    async function fetchCalls() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const result: unknown = await response.json();
        if (!Array.isArray(result)) {
          throw new Error("The API returned an unexpected response.");
        }

        if (isActive) {
          setCalls(result as CallRecord[]);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load call records."
          );
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    fetchCalls();

    return () => {
      isActive = false;
    };
  }, []);

  const cities = useMemo(() => {
    return Array.from(
      new Set(calls.map((call) => call.city?.trim()).filter(Boolean))
    ).sort((a, b) => a!.localeCompare(b!)) as string[];
  }, [calls]);

  const metrics = useMemo(() => {
    const successful = calls.filter((call) => isSuccessful(call.callStatus));
    const failed = calls.filter((call) => !isSuccessful(call.callStatus));
    const totalCost = calls.reduce((sum, call) => sum + getCost(call), 0);
    const totalDuration = calls.reduce(
      (sum, call) => sum + getDuration(call),
      0
    );

    return {
      total: calls.length,
      successful: successful.length,
      failed: failed.length,
      totalCost,
      averageCost: calls.length ? totalCost / calls.length : 0,
      averageDuration: calls.length ? totalDuration / calls.length : 0,
    };
  }, [calls]);

  const durationStats = useMemo(() => {
    if (calls.length === 0) {
      return {
        longest: null as CallRecord | null,
        shortest: null as CallRecord | null,
      };
    }

    return {
      longest: calls.reduce((a, b) =>
        getDuration(a) >= getDuration(b) ? a : b
      ),
      shortest: calls.reduce((a, b) =>
        getDuration(a) <= getDuration(b) ? a : b
      ),
    };
  }, [calls]);

  const costByCity = useMemo(() => {
    const totals = new Map<string, number>();

    calls.forEach((call) => {
      const city = call.city?.trim() || "Unknown";
      totals.set(city, (totals.get(city) ?? 0) + getCost(call));
    });

    return [...totals.entries()]
      .map(([city, cost]) => ({ city, cost: Number(cost.toFixed(2)) }))
      .sort((a, b) => b.cost - a.cost);
  }, [calls]);

  const callsByCity = useMemo(() => {
    const totals = new Map<string, number>();

    calls.forEach((call) => {
      const city = call.city?.trim() || "Unknown";
      totals.set(city, (totals.get(city) ?? 0) + 1);
    });

    return [...totals.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  }, [calls]);

  const activityByHour = useMemo(() => {
    const totals = new Map<number, number>();

    calls.forEach((call) => {
      if (!call.callStartTime) return;

      const date = new Date(call.callStartTime);
      if (Number.isNaN(date.getTime())) return;

      const hour = date.getHours();
      totals.set(hour, (totals.get(hour) ?? 0) + 1);
    });

    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      calls: totals.get(hour) ?? 0,
    }));
  }, [calls]);

  const filteredCalls = useMemo(() => {
    const query = search.trim().toLowerCase();

    return calls.filter((call) => {
      const matchesCity = cityFilter === "all" || call.city === cityFilter;
      const successful = isSuccessful(call.callStatus);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "successful" && successful) ||
        (statusFilter === "failed" && !successful);

      const searchableText = [
        call.callerName,
        call.callerNumber,
        call.receiverNumber,
        call.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesCity &&
        matchesStatus &&
        searchableText.includes(query)
      );
    });
  }, [calls, cityFilter, statusFilter, search]);

  const recentCalls = useMemo(() => {
    return [...filteredCalls]
      .sort((a, b) => {
        const aTime = new Date(a.callStartTime ?? 0).getTime();
        const bTime = new Date(b.callStartTime ?? 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 100);
  }, [filteredCalls]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Call intelligence
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Call Analytics Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Monitor call volume, duration, costs, outcomes, and activity.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            API connected
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            Could not load call records: {error}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
            Loading call records…
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                title="Total Calls"
                value={metrics.total.toLocaleString("en-GB")}
                description="All records received"
                icon="☎"
                iconClass="bg-indigo-50 text-indigo-600"
              />
              <MetricCard
                title="Total Call Cost"
                value={formatMoney(metrics.totalCost)}
                description="Combined recorded cost"
                icon="£"
                iconClass="bg-emerald-50 text-emerald-600"
              />
              <MetricCard
                title="Average Duration"
                value={formatDuration(metrics.averageDuration)}
                description="Mean duration per call"
                icon="◷"
                iconClass="bg-violet-50 text-violet-600"
              />
              <MetricCard
                title="Successful Calls"
                value={metrics.successful.toLocaleString("en-GB")}
                description="Calls marked successful"
                icon="✓"
                iconClass="bg-green-50 text-green-600"
              />
              <MetricCard
                title="Failed Calls"
                value={metrics.failed.toLocaleString("en-GB")}
                description="Calls not marked successful"
                icon="!"
                iconClass="bg-rose-50 text-rose-600"
              />
            </div>

            <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Panel
                title="Call Duration Insights"
                subtitle="Longest, shortest, and average call"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Longest
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {durationStats.longest
                        ? formatDuration(getDuration(durationStats.longest))
                        : "—"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {durationStats.longest?.callerName || "No call data"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Shortest
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {durationStats.shortest
                        ? formatDuration(getDuration(durationStats.shortest))
                        : "—"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {durationStats.shortest?.callerName || "No call data"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Average
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {formatDuration(metrics.averageDuration)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Across all calls
                    </p>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Average Cost Per Call"
                subtitle="Total call cost divided by total calls"
              >
                <div className="flex min-h-40 flex-col justify-center rounded-xl bg-indigo-50 px-6 py-5">
                  <p className="text-sm font-medium text-indigo-700">
                    Average cost
                  </p>
                  <p className="mt-2 break-words text-4xl font-bold tracking-tight text-indigo-950">
                    {formatMoney(metrics.averageCost)}
                  </p>
                  <p className="mt-2 text-sm text-indigo-700">
                    Based on {metrics.total} call
                    {metrics.total === 1 ? "" : "s"}
                  </p>
                </div>
              </Panel>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Panel
                title="Call Cost by City"
                subtitle="Total recorded cost for each city"
              >
                <div className="h-72 min-w-0">
                  {costByCity.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={costByCity}
                        margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="city"
                          tick={{ fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `£${value}`}
                        />
                        <Tooltip
                          formatter={(value) => formatMoney(Number(value))}
                        />
                        <Bar
                          dataKey="cost"
                          name="Call cost"
                          fill="#6366f1"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              </Panel>

              <Panel
                title="Call Activity by Hour"
                subtitle="Calls grouped by their start hour"
              >
                <div className="h-72 min-w-0">
                  {calls.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={activityByHour}
                        margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 11 }}
                          interval={2}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="calls"
                          name="Calls"
                          stroke="#0d9488"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              </Panel>
            </div>

            <div className="mb-8">
              <Panel
                title="Calls by City"
                subtitle="Share of all call records by city"
              >
                {callsByCity.length ? (
                  <div className="grid min-w-0 grid-cols-1 items-center gap-4 md:grid-cols-2">
                    <div className="h-64 min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={callsByCity}
                            dataKey="count"
                            nameKey="city"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={88}
                            paddingAngle={2}
                            label={false}
                            labelLine={false}
                          >
                            {callsByCity.map((item, index) => (
                              <Cell
                                key={item.city}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, _name, item) => [
                              `${value} calls`,
                              item.payload.city,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="min-w-0 space-y-3">
                    {callsByCity.slice(0, 6).map((item, index) => {
                        const percentage = metrics.total
                          ? (item.count / metrics.total) * 100
                          : 0;
                        const color =
                          CHART_COLORS[index % CHART_COLORS.length];

                        return (
                          <div key={item.city} className="min-w-0">
                            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-3 w-3 shrink-0 rounded-sm"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="truncate text-slate-600">
                                  {item.city}
                                </span>
                              </div>
                              <span className="shrink-0 font-semibold text-slate-900">
                                {item.count}
                                <span className="ml-1 font-normal text-slate-500">
                                  ({percentage.toFixed(0)}%)
                                </span>
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Panel>
            </div>

            <Panel
              title="Recent Call Logs"
              subtitle="Search and filter call records. Showing up to 100 matching calls."
            >
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Search
                  </span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Name or phone number"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    City
                  </span>
                  <select
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">All cities</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Status
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">All statuses</option>
                    <option value="successful">Successful</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
              </div>

              <p className="mb-3 text-xs text-slate-500">
                {filteredCalls.length} matching call
                {filteredCalls.length === 1 ? "" : "s"}
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-semibold">Caller</th>
                      <th className="px-4 py-3 font-semibold">Caller number</th>
                      <th className="px-4 py-3 font-semibold">Receiver number</th>
                      <th className="px-4 py-3 font-semibold">City</th>
                      <th className="px-4 py-3 font-semibold">Duration</th>
                      <th className="px-4 py-3 font-semibold">Cost</th>
                      <th className="px-4 py-3 font-semibold">Start time</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {recentCalls.map((call, index) => {
                      const successful = isSuccessful(call.callStatus);

                      return (
                        <tr
                          key={call.id ?? index}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {call.callerName || "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {call.callerNumber || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {call.receiverNumber || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {call.city || "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDuration(getDuration(call))}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {formatMoney(getCost(call))}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(call.callStartTime)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                successful
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {successful ? "Successful" : "Failed"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {recentCalls.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          No calls match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        <footer className="mt-8 text-center text-xs text-slate-400">
          Call Analytics Dashboard · CDR API
        </footer>
      </div>
    </main>
  );
}