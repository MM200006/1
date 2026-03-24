import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

export function calculateDuration(
  startTime: Date,
  endTime: Date | null,
  totalPause: number
): number {
  const end = endTime || new Date();
  const diff = Math.floor((end.getTime() - startTime.getTime()) / 1000);
  return Math.max(0, diff - totalPause);
}
