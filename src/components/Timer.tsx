"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDuration } from "@/lib/utils";

interface TimerProps {
  startTime: string;
  totalPause: number;
  pausedAt: string | null;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  projectName: string;
}

export default function Timer({
  startTime,
  totalPause,
  pausedAt,
  onStop,
  onPause,
  onResume,
  projectName,
}: TimerProps) {
  const [elapsed, setElapsed] = useState(0);

  const calculateElapsed = useCallback(() => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    let pause = totalPause;

    if (pausedAt) {
      pause += Math.floor((now - new Date(pausedAt).getTime()) / 1000);
    }

    return Math.max(0, Math.floor((now - start) / 1000) - pause);
  }, [startTime, totalPause, pausedAt]);

  useEffect(() => {
    setElapsed(calculateElapsed());

    if (pausedAt) return;

    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateElapsed, pausedAt]);

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-blue-200 text-sm">Aktiver Timer</p>
          <p className="text-lg font-semibold">{projectName}</p>
        </div>

        <div className="text-center">
          <p className="text-4xl sm:text-5xl font-mono font-bold tracking-wider">
            {formatDuration(elapsed)}
          </p>
          {pausedAt && (
            <p className="text-yellow-300 text-sm mt-1 animate-pulse">
              ⏸ Pausiert
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {pausedAt ? (
            <button
              onClick={onResume}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Fortsetzen
            </button>
          ) : (
            <button
              onClick={onPause}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Pause
            </button>
          )}
          <button
            onClick={onStop}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Stoppen
          </button>
        </div>
      </div>
    </div>
  );
}
