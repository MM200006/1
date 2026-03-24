import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const projectId = searchParams.get("projectId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status");

    const isAdmin = ["ADMIN", "TEAMLEITER"].includes(session.user.role);
    const where: Record<string, unknown> = {};

    if (!isAdmin) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    if (from || to) {
      where.startTime = {};
      if (from) (where.startTime as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startTime as Record<string, unknown>).lte = new Date(to + "T23:59:59Z");
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, client: true, hourlyRate: true } },
      },
      orderBy: { startTime: "desc" },
      take: 500,
    });

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

// Start timer or create manual entry
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, manual, startTime, endTime, description } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Projekt erforderlich" }, { status: 400 });
    }

    // Check project assignment
    const assignment = await prisma.projectAssignment.findFirst({
      where: { userId: session.user.id, projectId },
    });

    // Allow admins even without assignment
    if (!assignment && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nicht diesem Projekt zugewiesen" },
        { status: 403 }
      );
    }

    if (manual) {
      // Manual entry
      if (!startTime || !endTime) {
        return NextResponse.json(
          { error: "Start- und Endzeit erforderlich" },
          { status: 400 }
        );
      }

      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationSec = (end.getTime() - start.getTime()) / 1000;

      if (durationSec < 60) {
        return NextResponse.json(
          { error: "Minimale Session-Dauer: 1 Minute" },
          { status: 400 }
        );
      }

      const entry = await prisma.timeEntry.create({
        data: {
          userId: session.user.id,
          projectId,
          startTime: start,
          endTime: end,
          description: description || null,
          manual: true,
          status: "PENDING",
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true, client: true, hourlyRate: true } },
        },
      });

      await createAuditLog({
        userId: session.user.id,
        action: "CREATE",
        entity: "TimeEntry",
        entityId: entry.id,
        newValues: { projectId, startTime, endTime, manual: true, description },
      });

      return NextResponse.json(entry);
    }

    // Timer start - check for existing active timer
    const activeTimer = await prisma.timeEntry.findFirst({
      where: { userId: session.user.id, endTime: null },
    });

    if (activeTimer) {
      return NextResponse.json(
        { error: "Es läuft bereits ein Timer. Bitte zuerst stoppen." },
        { status: 400 }
      );
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        projectId,
        startTime: new Date(),
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, client: true, hourlyRate: true } },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "TimeEntry",
      entityId: entry.id,
      newValues: { projectId, startTime: entry.startTime },
    });

    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
