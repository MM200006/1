"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/utils";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
}

interface ProjectData {
  id: string;
  name: string;
  client: string;
  hourlyRate: string;
  active: boolean;
  assignments: { user: { id: string; name: string } }[];
}

interface TimeEntryData {
  id: string;
  startTime: string;
  endTime: string | null;
  totalPause: number;
  pausedAt: string | null;
  description: string | null;
  status: string;
  manual: boolean;
  user: { id: string; name: string; email: string };
  project: { id: string; name: string; client: string; hourlyRate: string };
}

type TabType = "entries" | "projects" | "users" | "live";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("entries");
  const [users, setUsers] = useState<UserData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [liveTimers, setLiveTimers] = useState<TimeEntryData[]>([]);
  const [filters, setFilters] = useState({ userId: "", projectId: "", from: "", to: "", status: "" });

  // New user form
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "AGENT" });

  // New project form
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", client: "", hourlyRate: "" });

  // Assignment
  const [assignProject, setAssignProject] = useState<string | null>(null);
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);

  // Edit entry
  const [editEntry, setEditEntry] = useState<TimeEntryData | null>(null);
  const [editForm, setEditForm] = useState({ startTime: "", endTime: "", description: "" });

  const fetchAll = useCallback(async () => {
    const [usersRes, projectsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/projects"),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (projectsRes.ok) setProjects(await projectsRes.json());
  }, []);

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.projectId) params.set("projectId", filters.projectId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.status) params.set("status", filters.status);

    const res = await fetch(`/api/time-entries?${params}`);
    if (res.ok) setEntries(await res.json());
  }, [filters]);

  const fetchLive = useCallback(async () => {
    const res = await fetch("/api/dashboard/live");
    if (res.ok) setLiveTimers(await res.json());
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      if (!["ADMIN", "TEAMLEITER"].includes(session!.user.role)) { router.push("/dashboard"); return; }
      fetchAll();
    }
  }, [status, session, router, fetchAll]);

  useEffect(() => {
    if (tab === "entries") fetchEntries();
    if (tab === "live") { fetchLive(); const iv = setInterval(fetchLive, 10000); return () => clearInterval(iv); }
  }, [tab, fetchEntries, fetchLive]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) { setShowNewUser(false); setNewUser({ name: "", email: "", password: "", role: "AGENT" }); fetchAll(); }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newProject, hourlyRate: parseFloat(newProject.hourlyRate) }),
    });
    if (res.ok) { setShowNewProject(false); setNewProject({ name: "", client: "", hourlyRate: "" }); fetchAll(); }
  };

  const saveAssignment = async () => {
    if (!assignProject) return;
    await fetch("/api/projects/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: assignProject, userIds: assignUserIds }),
    });
    setAssignProject(null);
    fetchAll();
  };

  const approveEntry = async (id: string) => {
    await fetch(`/api/time-entries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
    fetchEntries();
  };

  const rejectEntry = async (id: string) => {
    await fetch(`/api/time-entries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject" }) });
    fetchEntries();
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    fetchEntries();
  };

  const openEditEntry = (entry: TimeEntryData) => {
    setEditEntry(entry);
    setEditForm({
      startTime: entry.startTime.slice(0, 16),
      endTime: entry.endTime ? entry.endTime.slice(0, 16) : "",
      description: entry.description || "",
    });
  };

  const saveEditEntry = async () => {
    if (!editEntry) return;
    await fetch(`/api/time-entries/${editEntry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: editForm.startTime,
        endTime: editForm.endTime || undefined,
        description: editForm.description,
      }),
    });
    setEditEntry(null);
    fetchEntries();
  };

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: "entries", label: "Zeiteinträge" },
    { key: "projects", label: "Projekte" },
    { key: "users", label: "Mitarbeiter" },
    { key: "live", label: "Live-Status" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Verwaltung</h1>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200 rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TIME ENTRIES TAB */}
      {tab === "entries" && (
        <div>
          {/* Filters */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <select value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800">
                <option value="">Alle Mitarbeiter</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800">
                <option value="">Alle Projekte</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" placeholder="Von" />
              <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" placeholder="Bis" />
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800">
                <option value="">Alle Status</option>
                <option value="PENDING">Ausstehend</option>
                <option value="APPROVED">Genehmigt</option>
                <option value="REJECTED">Abgelehnt</option>
              </select>
            </div>
            <button onClick={fetchEntries} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              Filtern
            </button>
          </div>

          {/* Edit Modal */}
          {editEntry && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Eintrag bearbeiten</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Startzeit</label>
                  <input type="datetime-local" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Endzeit</label>
                  <input type="datetime-local" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
                  <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditEntry(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Abbrechen</button>
                  <button onClick={saveEditEntry} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Speichern</button>
                </div>
              </div>
            </div>
          )}

          {/* Entries Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Mitarbeiter</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Projekt</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Datum</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Start</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Ende</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Dauer</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const dur = entry.endTime ? Math.floor((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000 - entry.totalPause) : 0;
                  return (
                    <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800">{entry.user.name}</td>
                      <td className="px-4 py-3 text-slate-800">{entry.project.name}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(entry.startTime).toLocaleDateString("de-DE")}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(entry.startTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.endTime ? new Date(entry.endTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "Läuft"}</td>
                      <td className="px-4 py-3 font-mono text-slate-800">{entry.endTime ? formatDuration(Math.max(0, dur)) : "–"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${entry.status === "APPROVED" ? "bg-green-100 text-green-700" : entry.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {entry.status === "APPROVED" ? "Genehmigt" : entry.status === "REJECTED" ? "Abgelehnt" : "Ausstehend"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {entry.status === "PENDING" && session?.user.role === "ADMIN" && (
                            <>
                              <button onClick={() => approveEntry(entry.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Genehmigen</button>
                              <button onClick={() => rejectEntry(entry.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Ablehnen</button>
                            </>
                          )}
                          {session?.user.role === "ADMIN" && (
                            <>
                              <button onClick={() => openEditEntry(entry)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Bearbeiten</button>
                              <button onClick={() => deleteEntry(entry.id)} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">Löschen</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {entries.length === 0 && <p className="p-5 text-slate-500 text-sm text-center">Keine Einträge gefunden.</p>}
          </div>
        </div>
      )}

      {/* PROJECTS TAB */}
      {tab === "projects" && (
        <div>
          {session?.user.role === "ADMIN" && (
            <button onClick={() => setShowNewProject(!showNewProject)} className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              {showNewProject ? "Abbrechen" : "+ Neues Projekt"}
            </button>
          )}

          {showNewProject && (
            <form onSubmit={createProject} className="bg-white rounded-lg border border-slate-200 p-6 mb-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Projektname</label>
                  <input type="text" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kunde</label>
                  <input type="text" value={newProject.client} onChange={(e) => setNewProject({ ...newProject, client: e.target.value })} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stundensatz (EUR)</label>
                  <input type="number" step="0.01" value={newProject.hourlyRate} onChange={(e) => setNewProject({ ...newProject, hourlyRate: e.target.value })} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
              </div>
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium">Erstellen</button>
            </form>
          )}

          {/* Assignment Modal */}
          {assignProject && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Mitarbeiter zuweisen</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {users.filter((u) => u.active).map((u) => (
                    <label key={u.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignUserIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setAssignUserIds([...assignUserIds, u.id]);
                          else setAssignUserIds(assignUserIds.filter((id) => id !== u.id));
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-800">{u.name} ({u.role})</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAssignProject(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Abbrechen</button>
                  <button onClick={saveAssignment} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Speichern</button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div key={p.id} className={`bg-white rounded-lg border p-5 ${p.active ? "border-slate-200" : "border-red-200 opacity-60"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">{p.name}</h3>
                    <p className="text-sm text-slate-500">{p.client}</p>
                    <p className="text-sm text-blue-600 font-medium mt-1">{p.hourlyRate} EUR/Std</p>
                  </div>
                  {!p.active && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Inaktiv</span>}
                </div>
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1">Zugewiesene Mitarbeiter ({p.assignments.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {p.assignments.map((a) => (
                      <span key={a.user.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{a.user.name}</span>
                    ))}
                    {p.assignments.length === 0 && <span className="text-xs text-slate-400">Keine</span>}
                  </div>
                </div>
                {session?.user.role === "ADMIN" && (
                  <button
                    onClick={() => {
                      setAssignProject(p.id);
                      setAssignUserIds(p.assignments.map((a) => a.user.id));
                    }}
                    className="mt-3 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mitarbeiter verwalten
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        <div>
          {session?.user.role === "ADMIN" && (
            <button onClick={() => setShowNewUser(!showNewUser)} className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              {showNewUser ? "Abbrechen" : "+ Neuer Mitarbeiter"}
            </button>
          )}

          {showNewUser && (
            <form onSubmit={createUser} className="bg-white rounded-lg border border-slate-200 p-6 mb-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Passwort</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rolle</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800">
                    <option value="AGENT">Agent</option>
                    <option value="TEAMLEITER">Teamleiter</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium">Erstellen</button>
            </form>
          )}

          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">E-Mail</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Rolle</th>
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-800 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : u.role === "TEAMLEITER" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LIVE STATUS TAB */}
      {tab === "live" && (
        <div>
          <p className="text-sm text-slate-500 mb-4">Aktualisiert sich automatisch alle 10 Sekunden.</p>
          {liveTimers.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-500">Derzeit arbeitet niemand.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveTimers.map((t) => {
                const elapsed = Math.floor((Date.now() - new Date(t.startTime).getTime()) / 1000 - t.totalPause);
                return (
                  <div key={t.id} className="bg-white rounded-lg border border-green-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{t.user.name}</p>
                        <p className="text-sm text-slate-500">{t.project.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-lg font-mono font-bold text-green-700 mt-1">{formatDuration(Math.max(0, elapsed))}</p>
                      </div>
                    </div>
                    {t.pausedAt && <p className="text-xs text-yellow-600 mt-2">Pausiert</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
