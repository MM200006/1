import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "TEAMLEITER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const activeTimers = await prisma.timeEntry.findMany({
      where: { endTime: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(activeTimers);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
