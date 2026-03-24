import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "TEAMLEITER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {
      endTime: { not: null },
    };

    if (from || to) {
      where.startTime = {};
      if (from) (where.startTime as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startTime as Record<string, unknown>).lte = new Date(to + "T23:59:59Z");
    }
    if (projectId) where.projectId = projectId;
    if (userId) where.userId = userId;

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { name: true } },
        project: { select: { name: true, client: true, hourlyRate: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const rows = entries.map((e) => {
      const durationSec = e.endTime
        ? (e.endTime.getTime() - e.startTime.getTime()) / 1000 - e.totalPause
        : 0;
      const hours = Math.round((durationSec / 3600) * 100) / 100;

      return {
        Mitarbeiter: e.user.name,
        Projekt: e.project.name,
        Kunde: e.project.client,
        Datum: e.startTime.toISOString().split("T")[0],
        Startzeit: e.startTime.toLocaleTimeString("de-DE"),
        Endzeit: e.endTime!.toLocaleTimeString("de-DE"),
        "Pause (Min)": Math.round(e.totalPause / 60),
        "Dauer (Std)": hours,
        Stundensatz: Number(e.project.hourlyRate),
        Betrag: Math.round(hours * Number(e.project.hourlyRate) * 100) / 100,
        Status: e.status,
        Beschreibung: e.description || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Zeiterfassung");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="zeiterfassung_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="zeiterfassung_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
