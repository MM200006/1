"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ReportEntry {
  id: string;
  mitarbeiter: string;
  projekt: string;
  kunde: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  dauerStunden: number;
  stundensatz: number;
  betrag: number;
  beschreibung: string;
}

interface ProjectSummary {
  [key: string]: { stunden: number; betrag: number };
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [summary, setSummary] = useState<ProjectSummary>({});
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
    projectId: "",
    userId: "",
  });
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.projectId) params.set("projectId", filters.projectId);
    if (filters.userId) params.set("userId", filters.userId);

    const res = await fetch(`/api/reports?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries || []);
      setSummary(data.projectSummary || {});
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      if (!["ADMIN", "TEAMLEITER"].includes(session!.user.role)) { router.push("/dashboard"); return; }
      fetch("/api/users").then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : []));
      fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(Array.isArray(d) ? d : []));
      fetchReport();
    }
  }, [status, session, router, fetchReport]);

  const exportData = (format: string) => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.projectId) params.set("projectId", filters.projectId);
    if (filters.userId) params.set("userId", filters.userId);

    window.open(`/api/reports/export?${params}`, "_blank");
  };

  const totalHours = entries.reduce((a, e) => a + e.dauerStunden, 0);
  const totalAmount = entries.reduce((a, e) => a + e.betrag, 0);

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Reports & Abrechnung</h1>
        <div className="flex gap-2">
          <button onClick={() => exportData("xlsx")} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            Excel Export
          </button>
          <button onClick={() => exportData("csv")} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            CSV Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Von</label>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Bis</label>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Mitarbeiter</label>
            <select value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800">
              <option value="">Alle</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Projekt</label>
            <select value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800">
              <option value="">Alle</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={fetchReport} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          Aktualisieren
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Genehmigte Einträge</p>
          <p className="text-2xl font-bold text-slate-800">{entries.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Gesamtstunden</p>
          <p className="text-2xl font-bold text-slate-800">{totalHours.toFixed(2)} Std</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Gesamtbetrag</p>
          <p className="text-2xl font-bold text-green-600">{totalAmount.toFixed(2)} EUR</p>
        </div>
      </div>

      {/* Project Summary */}
      {Object.keys(summary).length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-700">Zusammenfassung nach Projekt</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Projekt</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Stunden</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Betrag (EUR)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary).map(([name, data]) => (
                  <tr key={name} className="border-t border-slate-100">
                    <td className="px-5 py-3 text-slate-800 font-medium">{name}</td>
                    <td className="px-5 py-3 text-slate-800">{data.stunden.toFixed(2)}</td>
                    <td className="px-5 py-3 text-green-600 font-medium">{data.betrag.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700">Detailübersicht</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin inline-block rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : entries.length === 0 ? (
          <p className="p-5 text-slate-500 text-sm text-center">Keine genehmigten Einträge für den gewählten Zeitraum.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Mitarbeiter</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Projekt</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Datum</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Start</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Ende</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Dauer (Std)</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Betrag (EUR)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{e.mitarbeiter}</td>
                    <td className="px-4 py-3 text-slate-800">{e.projekt}</td>
                    <td className="px-4 py-3 text-slate-600">{e.datum}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(e.startzeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(e.endzeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-3 font-mono text-slate-800">{e.dauerStunden.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-green-600">{e.betrag.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
