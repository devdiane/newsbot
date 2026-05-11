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
  filteredArticles: number;
  sentToTelegram: number;
  lastRun: string;
  isRunning: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    filteredArticles: 0,
    sentToTelegram: 0,
    lastRun: "--:--",
    isRunning: true,
  });
  const [loading, setLoading] = useState(false);

  // Get current time for display
  const [currentTime, setCurrentTime] = useState("");

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
    setLoading(true);
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
          filteredArticles: data.filteredCount || data.count || 0,
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

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">📡 Omega Pulse</h1>
          <p className="text-lg text-zinc-600 mt-1">
            Wind & Water Infrastructure Update
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-lg font-medium text-zinc-900">
                Status: {stats.isRunning ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-500">Next Run</p>
              <p className="text-lg font-semibold text-zinc-900">
                {getNextScheduledRun()}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-500">Last Run</p>
                <p className="text-xl font-semibold text-zinc-900">
                  {stats.lastRun}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Current Time</p>
                <p className="text-xl font-semibold text-zinc-900">
                  {currentTime}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sources Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Sources</h2>
          <div className="space-y-2">
            {SOURCES.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-zinc-700">
                  {source.status === "connected" ? "✔" : "◎"} {source.name}
                </span>
                <span
                  className={`text-sm ${
                    source.status === "connected"
                      ? "text-green-600"
                      : "text-yellow-600"
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-sm text-zinc-500 mb-1">
              Filtered Articles Today
            </p>
            <p className="text-4xl font-bold text-zinc-900">
              {stats.filteredArticles}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-sm text-zinc-500 mb-1">Sent to Telegram</p>
            <p className="text-4xl font-bold text-zinc-900">
              {stats.sentToTelegram}
            </p>
          </div>
        </div>

        {/* Fetch Button */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <button
            onClick={fetchNow}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Fetching..." : "Fetch Now"}
          </button>
        </div>

        {/* System Info */}
        <div className="text-center text-sm text-zinc-500">
          <p>
            Scheduled daily at 9:00 AM • Filters: Water, Dam, Reservoir, Flood,
            Irrigation, Hydropower, Wind, Turbine, DOE, DENR, LWUA
          </p>
        </div>
      </div>
    </div>
  );
}
