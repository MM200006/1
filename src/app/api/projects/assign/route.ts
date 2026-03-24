import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const { projectId, userIds } = await req.json();
    if (!projectId || !Array.isArray(userIds)) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    // Remove existing assignments
    await prisma.projectAssignment.deleteMany({ where: { projectId } });

    // Create new assignments
    await prisma.projectAssignment.createMany({
      data: userIds.map((userId: string) => ({ projectId, userId })),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
