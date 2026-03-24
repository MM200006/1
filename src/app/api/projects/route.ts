import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const where =
      session.user.role === "ADMIN" || session.user.role === "TEAMLEITER"
        ? {}
        : { assignments: { some: { userId: session.user.id } } };

    const projects = await prisma.project.findMany({
      where,
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { timeEntries: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const { name, client, hourlyRate } = await req.json();
    if (!name || !client || hourlyRate === undefined) {
      return NextResponse.json(
        { error: "Name, Kunde und Stundensatz sind erforderlich" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: { name, client, hourlyRate },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "Project",
      entityId: project.id,
      newValues: { name, client, hourlyRate },
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const { id, name, client, hourlyRate, active } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Projekt ID erforderlich" }, { status: 400 });
    }

    const old = await prisma.project.findUnique({ where: { id } });
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(client !== undefined && { client }),
        ...(hourlyRate !== undefined && { hourlyRate }),
        ...(active !== undefined && { active }),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Project",
      entityId: id,
      oldValues: old as unknown as Record<string, unknown>,
      newValues: { name, client, hourlyRate, active },
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
