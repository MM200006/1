import prisma from "./prisma";
import { Prisma } from "@prisma/client";

export async function createAuditLog(params: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValues: (params.oldValues as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      newValues: (params.newValues as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
}
