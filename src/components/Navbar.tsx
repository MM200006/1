"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";
  const isLeader = session.user.role === "TEAMLEITER";

  return (
    <nav className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-400">
              TimeTrack
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/time"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition"
              >
                Zeiterfassung
              </Link>
              {(isAdmin || isLeader) && (
                <>
                  <Link
                    href="/admin"
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition"
                  >
                    Verwaltung
                  </Link>
                  <Link
                    href="/reports"
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition"
                  >
                    Reports
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link
                  href="/admin/audit"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition"
                >
                  Audit Log
                </Link>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-slate-300">
              {session.user.name}{" "}
              <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                {session.user.role}
              </span>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition"
            >
              Abmelden
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-300 hover:text-white p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-700">
          <div className="px-4 py-3 space-y-2">
            <Link href="/dashboard" className="block px-3 py-2 rounded hover:bg-slate-800" onClick={() => setMenuOpen(false)}>
              Dashboard
            </Link>
            <Link href="/time" className="block px-3 py-2 rounded hover:bg-slate-800" onClick={() => setMenuOpen(false)}>
              Zeiterfassung
            </Link>
            {(isAdmin || isLeader) && (
              <>
                <Link href="/admin" className="block px-3 py-2 rounded hover:bg-slate-800" onClick={() => setMenuOpen(false)}>
                  Verwaltung
                </Link>
                <Link href="/reports" className="block px-3 py-2 rounded hover:bg-slate-800" onClick={() => setMenuOpen(false)}>
                  Reports
                </Link>
              </>
            )}
            <div className="pt-2 border-t border-slate-700">
              <p className="text-sm text-slate-400 px-3">{session.user.name} ({session.user.role})</p>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-2 w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-800 rounded"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
