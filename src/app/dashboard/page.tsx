"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Timer from "@/components/Timer";
import { formatDuration } from "@/lib/utils";

interface TimeEntryData {
  id: string;
  startTime: string;
  endTime: string | null;
  totalPause: number;
  pausedAt: string | null;
  description: string | null;
  status: string;
  project: { id: string; name: string; client: string; hourlyRate: string };
  user?: { id: string; name: string };
}

interface ProjectData {
  id: string;
  name: string;
  client: string;
  hourlyRate: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTimer, setActiveTimer] = useState<TimeEntryData | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntryData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const [activeRes, entriesRes, projectsRes] = await Promise.all([
        fetch("/api/time-entries/active"),
        fetch(`/api/time-entries?from=${today}&to=${today}`),
        fetch("/api/projects"),
      ]);

      const active = await activeRes.json();
      const entries = await entriesRes.json();
      const projs = await projectsRes.json();

      setActiveTimer(active);
      setTodayEntries(Array.isArray(entries) ? entries.filter((e: TimeEntryData) => e.endTime) : []);
      setProjects(Array.isArray(projs) ? projs : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const startTimer = async (projectId: string) => {
    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (res.ok) fetchData();
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    const res = await fetch(`/api/time-entries/${activeTimer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    if (res.ok) fetchData();
  };

  const pauseTimer = async () => {
    if (!activeTimer) return;
    await fetch(`/api/time-entries/${activeTimer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause" }),
    });
    fetchData();
  };

  const resumeTimer = async () => {
    if (!activeTimer) return;
    await fetch(`/api/time-entries/${activeTimer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resume" }),
    });
    fetchData();
  };

  const todayTotal = todayEntries.reduce((acc, e) => {
    if (!e.endTime) return acc;
    const dur =
      (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 1000 -
      e.totalPause;
    return acc + Math.max(0, dur);
  }, 0);

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Hallo, {session?.user?.name}!
      </h1>

      {/* Active Timer */}
      {activeTimer && (
        <div className="mb-8">
          <Timer
            startTime={activeTimer.startTime}
            totalPause={activeTimer.totalPause}
            pausedAt={activeTimer.pausedAt}
            projectName={activeTimer.project.name}
            onStop={stopTimer}
            onPause={pauseTimer}
            onResume={resumeTimer}
          />
        </div>
      )}

      {/* Quick Start */}
      {!activeTimer && projects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-3">
            Timer starten
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.filter((p: ProjectData & { active?: boolean }) => p.active !== false).map((project) => (
              <button
                key={project.id}
                onClick={() => startTimer(project.id)}
                className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:border-blue-400 hover:shadow-md transition group"
              >
                <p className="font-medium text-slate-800 group-hover:text-blue-600">
                  {project.name}
                </p>
                <p className="text-sm text-slate-500">{project.client}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {project.hourlyRate} EUR/Std
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg p-5 border border-slate-200">
          <p className="text-sm text-slate-500">Heute gearbeitet</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {formatDuration(Math.floor(todayTotal))}
          </p>
        </div>
        <div className="bg-white rounded-lg p-5 border border-slate-200">
          <p className="text-sm text-slate-500">Sessions heute</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {todayEntries.length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-5 border border-slate-200">
          <p className="text-sm text-slate-500">Zugewiesene Projekte</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {projects.length}
          </p>
        </div>
      </div>

      {/* Today's Entries */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700">
            Heutige Einträge
          </h2>
        </div>
        {todayEntries.length === 0 ? (
          <p className="p-5 text-slate-500 text-sm">
            Noch keine Einträge heute.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Projekt</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Start</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Ende</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Dauer</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayEntries.map((entry) => {
                  const dur = entry.endTime
                    ? Math.floor(
                        (new Date(entry.endTime).getTime() -
                          new Date(entry.startTime).getTime()) /
                          1000 -
                          entry.totalPause
                      )
                    : 0;
                  return (
                    <tr key={entry.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 text-slate-800">{entry.project.name}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {new Date(entry.startTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {entry.endTime
                          ? new Date(entry.endTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                          : "–"}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-800">
                        {formatDuration(Math.max(0, dur))}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            entry.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : entry.status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {entry.status === "APPROVED" ? "Genehmigt" : entry.status === "REJECTED" ? "Abgelehnt" : "Ausstehend"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
