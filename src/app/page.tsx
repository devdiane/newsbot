"use client";

import { useEffect, useState } from "react";

// Source interface matching fetchNews.ts
interface Source {
  id: string;
  name: string;
  status: "connected" | "target";
}

// Sources data - will be imported from fetchNews.ts
const SOURCES: Source[] = [
  { id: "inquirer", name: "Inquirer", status: "connected" },
  { id: "abs-cbn", name: "ABS-CBN", status: "connected" },
  { id: "mb", name: "Manila Bulletin", status: "connected" },
  { id: "doe", name: "DOE", status: "target" },
  { id: "denr", name: "DENR", status: "target" },
];

interface DashboardStats {
  totalArticles: number;
  windArticles: number;
  waterArticles: number;
  sentToTelegram: number;
  lastRun: string | null;
  isRunning: boolean;
}

// Skeleton components - moved to module level to prevent hydration mismatch
function StatsSkeleton() {
  return (
    <>
      <div className="glass-card p-6 rounded-2xl text-center animate-pulse">
        <div className="text-3xl mb-2">💨</div>
        <div className="h-4 w-32 bg-sky-200 rounded mb-2 mx-auto"></div>
        <div className="h-10 w-16 bg-sky-200 rounded mx-auto"></div>
      </div>
      <div className="glass-card p-6 rounded-2xl text-center animate-pulse">
        <div className="text-3xl mb-2">🌊</div>
        <div className="h-4 w-32 bg-cyan-200 rounded mb-2 mx-auto"></div>
        <div className="h-10 w-16 bg-cyan-200 rounded mx-auto"></div>
      </div>
      <div className="glass-card p-6 rounded-2xl text-center animate-pulse">
        <div className="text-3xl mb-2">📱</div>
        <div className="h-4 w-32 bg-sky-200 rounded mb-2 mx-auto"></div>
        <div className="h-10 w-16 bg-sky-200 rounded mx-auto"></div>
      </div>
    </>
  );
}

function SourcesSkeleton() {
  return (
    <div className="glass-card p-6 rounded-2xl mb-6 animate-pulse">
      <div className="h-6 w-20 bg-sky-200 rounded mb-4"></div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-6 bg-sky-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    windArticles: 0,
    waterArticles: 0,
    sentToTelegram: 0,
    lastRun: null,
    isRunning: true,
  });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  // Get current time for display - use null to indicate hydration not complete
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stats from API on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();

      if (data.success) {
        // Format last run time
        let lastRunStr = "--:--";
        if (data.lastRun) {
          const lastRunDate = new Date(data.lastRun);
          lastRunStr = lastRunDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        setStats((prev) => ({
          ...prev,
          windArticles: data.windArticlesToday || 0,
          waterArticles: data.waterArticlesToday || 0,
          sentToTelegram: data.sentToTelegram || 0,
          lastRun: lastRunStr,
          isRunning: true,
        }));
      }
    } catch (error) {
      console.error("Stats error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate next scheduled run (9:00 AM)
  const getNextScheduledRun = () => {
    const now = new Date();
    const scheduledHour = 9;
    const scheduledMinute = 0;

    let nextRun = new Date(now);
    nextRun.setHours(scheduledHour, scheduledMinute, 0, 0);

    // If it's already past 9 AM today, schedule for tomorrow
    if (now.getTime() > nextRun.getTime()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchNow = async () => {
    setFetching(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const res = await fetch("/api/fetch", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setStats((prev) => ({
          ...prev,
          totalArticles: data.totalArticles || data.articles?.length || 0,
          windArticles: data.windCount || 0,
          waterArticles: data.waterCount || 0,
          sentToTelegram: data.sentCount || data.count || 0,
          lastRun: timeStr,
          isRunning: true,
        }));
      } else {
        setStats((prev) => ({
          ...prev,
          isRunning: false,
        }));
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setStats((prev) => ({
        ...prev,
        isRunning: false,
      }));
    }

    setFetching(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-100 to-cyan-100 p-8 relative overflow-hidden">
      {/* Wind & Water decorative elements */}
      <div className="absolute top-0 left-0 w-full h-32 opacity-30 pointer-events-none">
        <div className="wind-wave absolute top-8 left-10 text-8xl text-sky-200">
          💨
        </div>
        <div className="wind-wave absolute top-16 right-20 text-6xl text-cyan-200 delay-100">
          🌊
        </div>
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-ocean-700 drop-shadow-sm">
            📡 <span className="text-sky-600">Omega</span>{" "}
            <span className="text-cyan-600">Pulse</span>
          </h1>
          <p className="text-lg text-sky-700 mt-2 font-medium">
            Wind & Water Infrastructure Update
          </p>
        </div>

        {/* Status Card - Blue Theme with Glassmorphism */}
        <div className="glass-card p-6 rounded-2xl mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-sky-500 animate-pulse"></div>
              <span className="text-lg font-semibold text-sky-800">
                Status:{" "}
                {stats.isRunning ? (
                  <span className="text-sky-600">Active</span>
                ) : (
                  <span className="text-red-500">Inactive</span>
                )}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-cyan-600">Next Run</p>
              <p className="text-lg font-bold text-sky-800">
                {getNextScheduledRun()}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-sky-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-cyan-600">Last Run</p>
                <div className="text-xl font-bold text-sky-800">
                  {loading ? (
                    <div className="h-8 w-20 bg-sky-200 rounded animate-pulse"></div>
                  ) : (
                    stats.lastRun || "--:--"
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-cyan-600">Current Time</p>
                <div className="text-xl font-bold text-sky-800">
                  {currentTime || "--:--"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sources Card - Blue Theme with Glassmorphism */}
        {loading ? (
          <SourcesSkeleton />
        ) : (
          <div className="glass-card p-6 rounded-2xl mb-6">
            <h2 className="text-lg font-semibold text-sky-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">📰</span> Sources
            </h2>
            <div className="space-y-2">
              {SOURCES.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-sky-50/50 hover:bg-sky-100/50 transition-colors"
                >
                  <span className="text-sky-700 font-medium">
                    {source.status === "connected" ? "✓" : "◎"} {source.name}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      source.status === "connected"
                        ? "text-sky-600"
                        : "text-amber-600"
                    }`}
                  >
                    {source.status === "connected"
                      ? "Connected"
                      : "Target Agency"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards - Blue Theme with Glassmorphism */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {loading ? (
            <StatsSkeleton />
          ) : (
            <>
              <div className="glass-card p-6 rounded-2xl text-center hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">💨</div>
                <p className="text-sm text-sky-600 mb-1 font-medium">
                  Wind Articles Today
                </p>
                <p className="text-5xl font-bold text-sky-600 drop-shadow-sm">
                  {stats.windArticles}
                </p>
              </div>
              <div className="glass-card p-6 rounded-2xl text-center hover:scale-105 transition-transform water-ripple">
                <div className="text-3xl mb-2">🌊</div>
                <p className="text-sm text-cyan-600 mb-1 font-medium">
                  Water Articles Today
                </p>
                <p className="text-5xl font-bold text-cyan-600 drop-shadow-sm">
                  {stats.waterArticles}
                </p>
              </div>
              <div className="glass-card p-6 rounded-2xl text-center hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">📱</div>
                <p className="text-sm text-sky-600 mb-1 font-medium">
                  Sent to Telegram
                </p>
                <p className="text-5xl font-bold text-sky-800 drop-shadow-sm">
                  {stats.sentToTelegram}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Fetch Button - Blue Theme */}
        <div className="glass-card p-6 rounded-2xl mb-6">
          <button
            onClick={fetchNow}
            disabled={fetching}
            className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:from-sky-600 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            {fetching ? "⏳ Fetching Articles..." : "⚡ Fetch Now"}
          </button>
        </div>

        {/* System Info - Blue Theme */}
        <div className="text-center text-sm text-sky-600 mt-8">
          <p className="bg-sky-100/50 inline-block px-4 py-2 rounded-full">
            ☀️ Scheduled daily at 9:00 AM • 🌊 Filters: Water, Dam, Reservoir,
            Flood, Irrigation, Hydropower • 💨 Wind, Turbine, DOE, DENR, LWUA
          </p>
        </div>
      </div>
    </div>
  );
}
