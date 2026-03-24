import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const activeEntry = await prisma.timeEntry.findFirst({
      where: { userId: session.user.id, endTime: null },
      include: {
        project: { select: { id: true, name: true, client: true, hourlyRate: true } },
      },
    });

    return NextResponse.json(activeEntry);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
