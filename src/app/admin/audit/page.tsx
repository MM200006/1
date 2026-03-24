"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; email: string };
}

export default function AuditLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      if (session!.user.role !== "ADMIN") { router.push("/dashboard"); return; }
      fetch("/api/audit-logs?limit=200")
        .then((r) => r.json())
        .then((d) => setLogs(Array.isArray(d) ? d : []));
    }
  }, [status, session, router]);

  const actionLabels: Record<string, string> = {
    CREATE: "Erstellt",
    UPDATE: "Geändert",
    DELETE: "Gelöscht",
    APPROVE: "Genehmigt",
    REJECT: "Abgelehnt",
  };

  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
    APPROVE: "bg-emerald-100 text-emerald-700",
    REJECT: "bg-orange-100 text-orange-700",
  };

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Audit Log</h1>

      <div className="bg-white rounded-lg border border-slate-200">
        {logs.length === 0 ? (
          <p className="p-5 text-slate-500 text-sm text-center">Keine Einträge.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${actionColors[log.action] || "bg-slate-100 text-slate-600"}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                    <span className="text-sm text-slate-800">
                      <strong>{log.user.name}</strong> hat <strong>{log.entity}</strong> {actionLabels[log.action]?.toLowerCase() || log.action}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString("de-DE")}
                  </span>
                </div>

                {expanded === log.id && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {log.oldValues && (
                      <div>
                        <p className="font-medium text-slate-600 mb-1">Alte Werte:</p>
                        <pre className="bg-red-50 p-3 rounded-lg overflow-auto text-red-800 max-h-40">
                          {JSON.stringify(log.oldValues, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.newValues && (
                      <div>
                        <p className="font-medium text-slate-600 mb-1">Neue Werte:</p>
                        <pre className="bg-green-50 p-3 rounded-lg overflow-auto text-green-800 max-h-40">
                          {JSON.stringify(log.newValues, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
