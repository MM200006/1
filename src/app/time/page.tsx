"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/utils";

interface ProjectData {
  id: string;
  name: string;
  client: string;
}

interface TimeEntryData {
  id: string;
  startTime: string;
  endTime: string | null;
  totalPause: number;
  description: string | null;
  status: string;
  manual: boolean;
  project: { id: string; name: string; client: string };
}

export default function TimePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    description: "",
  });
  const [error, setError] = useState("");

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/time-entries");
    if (res.ok) {
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchEntries();
      fetch("/api/projects")
        .then((r) => r.json())
        .then((d) => setProjects(Array.isArray(d) ? d : []));
    }
  }, [status, router, fetchEntries]);

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const startTime = new Date(`${form.date}T${form.startTime}:00`);
    const endTime = new Date(`${form.date}T${form.endTime}:00`);

    if (endTime <= startTime) {
      setError("Endzeit muss nach Startzeit liegen");
      return;
    }

    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId,
        manual: true,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        description: form.description,
      }),
    });

    if (res.ok) {
      setShowManual(false);
      setForm({ ...form, description: "" });
      fetchEntries();
    } else {
      const data = await res.json();
      setError(data.error || "Fehler");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Zeiterfassung</h1>
        <button
          onClick={() => setShowManual(!showManual)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {showManual ? "Abbrechen" : "+ Manueller Eintrag"}
        </button>
      </div>

      {/* Manual Entry Form */}
      {showManual && (
        <form
          onSubmit={handleManualEntry}
          className="bg-white rounded-lg border border-slate-200 p-6 mb-6 space-y-4"
        >
          <h3 className="font-semibold text-slate-700">Manueller Zeiteintrag</h3>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Projekt</label>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Auswählen...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Datum</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Startzeit</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Endzeit</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
              placeholder="Was wurde gemacht?"
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
          >
            Eintrag speichern
          </button>
        </form>
      )}

      {/* Entries List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700">Meine Zeiteinträge</h2>
        </div>

        {entries.length === 0 ? (
          <p className="p-5 text-slate-500 text-sm">Keine Einträge vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Datum</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Projekt</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Start</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Ende</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Dauer</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Typ</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const dur = entry.endTime
                    ? Math.floor(
                        (new Date(entry.endTime).getTime() -
                          new Date(entry.startTime).getTime()) /
                          1000 -
                          entry.totalPause
                      )
                    : 0;
                  return (
                    <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-800">
                        {new Date(entry.startTime).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-5 py-3 text-slate-800">{entry.project.name}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {new Date(entry.startTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {entry.endTime
                          ? new Date(entry.endTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                          : "Läuft..."}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-800">
                        {entry.endTime ? formatDuration(Math.max(0, dur)) : "–"}
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
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {entry.manual ? "Manuell" : "Timer"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {session?.user?.role === "AGENT" && (
        <p className="mt-4 text-xs text-slate-400">
          Hinweis: Einträge können nach dem Absenden nicht mehr geändert werden. Wenden Sie sich an Ihren Admin für Korrekturen.
        </p>
      )}
    </div>
  );
}
