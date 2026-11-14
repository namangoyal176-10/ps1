import { prisma } from '../config/prisma.js';
import { AuditAction, Prisma } from '@prisma/client';

export async function logAudit(params: {
  teamId?: string | null;
  actorId?: string | null;
  action: AuditAction;
  details?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}) {
  const client = params.tx || prisma;
  return client.auditLog.create({
    data: {
      teamId: params.teamId,
      actorId: params.actorId,
      action: params.action,
      details: params.details,
    },
  });
}

export async function getTeamAuditLogs(teamId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export async function getGlobalAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}
