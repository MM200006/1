import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "TEAMLEITER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        projects: {
          include: { project: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
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

    const { id, name, email, role, active } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "User ID erforderlich" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(active !== undefined && { active }),
      },
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
