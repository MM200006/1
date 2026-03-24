import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where = entityId ? { entityId } : {};

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
