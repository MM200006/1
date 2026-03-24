import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "TEAMLEITER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {
      endTime: { not: null },
      status: "APPROVED",
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
        user: { select: { name: true, email: true } },
        project: { select: { name: true, client: true, hourlyRate: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const reportData = entries.map((entry) => {
      const durationSec = entry.endTime
        ? (entry.endTime.getTime() - entry.startTime.getTime()) / 1000 - entry.totalPause
        : 0;
      const hours = durationSec / 3600;
      const rate = Number(entry.project.hourlyRate);

      return {
        id: entry.id,
        mitarbeiter: entry.user.name,
        email: entry.user.email,
        projekt: entry.project.name,
        kunde: entry.project.client,
        datum: entry.startTime.toISOString().split("T")[0],
        startzeit: entry.startTime.toISOString(),
        endzeit: entry.endTime!.toISOString(),
        pauseSekunden: entry.totalPause,
        dauerStunden: Math.round(hours * 100) / 100,
        stundensatz: rate,
        betrag: Math.round(hours * rate * 100) / 100,
        beschreibung: entry.description || "",
      };
    });

    // Summary by project
    const projectSummary: Record<string, { stunden: number; betrag: number }> = {};
    for (const row of reportData) {
      if (!projectSummary[row.projekt]) {
        projectSummary[row.projekt] = { stunden: 0, betrag: 0 };
      }
      projectSummary[row.projekt].stunden += row.dauerStunden;
      projectSummary[row.projekt].betrag += row.betrag;
    }

    return NextResponse.json({ entries: reportData, projectSummary });
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
