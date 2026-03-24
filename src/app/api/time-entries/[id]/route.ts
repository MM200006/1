import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

// Stop timer, pause/resume, update entry
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, description, startTime, endTime, status: newStatus } = body;

    const entry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
    }

    const isOwner = entry.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    // Agents can only modify their own running timers
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    // Agents cannot edit approved/completed entries
    if (isOwner && !isAdmin && entry.status === "APPROVED") {
      return NextResponse.json(
        { error: "Genehmigte Einträge können nicht geändert werden" },
        { status: 403 }
      );
    }

    const oldValues = {
      startTime: entry.startTime,
      endTime: entry.endTime,
      totalPause: entry.totalPause,
      pausedAt: entry.pausedAt,
      status: entry.status,
      description: entry.description,
    };

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "stop": {
        if (entry.endTime) {
          return NextResponse.json(
            { error: "Timer ist bereits gestoppt" },
            { status: 400 }
          );
        }

        const now = new Date();
        let additionalPause = 0;
        if (entry.pausedAt) {
          additionalPause = Math.floor(
            (now.getTime() - entry.pausedAt.getTime()) / 1000
          );
        }

        const totalPause = entry.totalPause + additionalPause;
        const durationSec =
          (now.getTime() - entry.startTime.getTime()) / 1000 - totalPause;

        if (durationSec < 60) {
          // Delete entries shorter than 1 minute
          await prisma.timeEntry.delete({ where: { id } });
          await createAuditLog({
            userId: session.user.id,
            action: "DELETE",
            entity: "TimeEntry",
            entityId: id,
            oldValues: oldValues as unknown as Record<string, unknown>,
          });
          return NextResponse.json({
            deleted: true,
            reason: "Session unter 1 Minute",
          });
        }

        updateData = {
          endTime: now,
          totalPause,
          pausedAt: null,
        };
        break;
      }

      case "pause": {
        if (entry.pausedAt) {
          return NextResponse.json(
            { error: "Timer ist bereits pausiert" },
            { status: 400 }
          );
        }
        if (entry.endTime) {
          return NextResponse.json(
            { error: "Timer ist bereits gestoppt" },
            { status: 400 }
          );
        }
        updateData = { pausedAt: new Date() };
        break;
      }

      case "resume": {
        if (!entry.pausedAt) {
          return NextResponse.json(
            { error: "Timer ist nicht pausiert" },
            { status: 400 }
          );
        }
        const pauseDuration = Math.floor(
          (Date.now() - entry.pausedAt.getTime()) / 1000
        );
        updateData = {
          pausedAt: null,
          totalPause: entry.totalPause + pauseDuration,
        };
        break;
      }

      case "approve": {
        if (!isAdmin) {
          return NextResponse.json({ error: "Nur Admin" }, { status: 403 });
        }
        updateData = {
          status: "APPROVED",
          approved: true,
          approvedBy: session.user.id,
          approvedAt: new Date(),
        };
        break;
      }

      case "reject": {
        if (!isAdmin) {
          return NextResponse.json({ error: "Nur Admin" }, { status: 403 });
        }
        updateData = { status: "REJECTED", approved: false };
        break;
      }

      default: {
        // Direct field updates (admin only for completed entries)
        if (!isAdmin && entry.endTime) {
          return NextResponse.json(
            { error: "Nur Admin kann abgeschlossene Einträge bearbeiten" },
            { status: 403 }
          );
        }

        if (description !== undefined) updateData.description = description;
        if (startTime !== undefined) updateData.startTime = new Date(startTime);
        if (endTime !== undefined) updateData.endTime = new Date(endTime);
        if (newStatus !== undefined && isAdmin) updateData.status = newStatus;
      }
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, client: true, hourlyRate: true } },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: action === "approve" || action === "reject" ? action.toUpperCase() : "UPDATE",
      entity: "TimeEntry",
      entityId: id,
      oldValues: oldValues as unknown as Record<string, unknown>,
      newValues: updateData as Record<string, unknown>,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const { id } = await params;
    const entry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entity: "TimeEntry",
      entityId: id,
      oldValues: entry as unknown as Record<string, unknown>,
    });

    await prisma.timeEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
