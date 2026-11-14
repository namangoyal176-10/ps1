import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { generateInviteCode } from '../utils/codeGenerator.js';
import { MemberRole } from '@prisma/client';
import { logAudit } from './auditService.js';

export interface CreateInviteDTO {
  teamId: string;
  maxUses?: number;
  expiresInHours?: number; // e.g. 24, 72, 168 (7 days)
}

export async function createTeamInvite(userId: string, dto: CreateInviteDTO) {
  // Check if requester is team leader
  const membership = await prisma.teamMember.findUnique({
    where: { userId },
  });

  if (!membership || membership.teamId !== dto.teamId || membership.role !== MemberRole.LEADER) {
    throw new AppError(403, 'Only the team leader can generate invitation codes');
  }

  // Generate unique code
  let code = generateInviteCode(8);
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.teamInvite.findUnique({ where: { code } });
    if (!existing) break;
    code = generateInviteCode(8);
    attempts++;
  }

  const hours = dto.expiresInHours && dto.expiresInHours > 0 ? dto.expiresInHours : 72; // default 3 days
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
  const maxUses = dto.maxUses && dto.maxUses > 0 ? dto.maxUses : 1;

  const invite = await prisma.teamInvite.create({
    data: {
      teamId: dto.teamId,
      code,
      createdBy: userId,
      maxUses,
      usedCount: 0,
      expiresAt,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  await logAudit({
    teamId: dto.teamId,
    actorId: userId,
    action: 'INVITE_CREATED',
    details: { code, maxUses, expiresAt },
  });

  return invite;
}

export async function revokeTeamInvite(userId: string, inviteId: string) {
  const invite = await prisma.teamInvite.findUnique({
    where: { id: inviteId },
    include: { team: true },
  });

  if (!invite) {
    throw new AppError(404, 'Invitation not found');
  }

  const membership = await prisma.teamMember.findUnique({
    where: { userId },
  });

  if (!membership || membership.teamId !== invite.teamId || membership.role !== MemberRole.LEADER) {
    throw new AppError(403, 'Only the team leader can revoke invitations');
  }

  const updated = await prisma.teamInvite.update({
    where: { id: inviteId },
    data: { isRevoked: true },
  });

  await logAudit({
    teamId: invite.teamId,
    actorId: userId,
    action: 'INVITE_REVOKED',
    details: { inviteId, code: invite.code },
  });

  return updated;
}

export async function validateInviteCode(code: string) {
  const cleanCode = code.trim().toUpperCase();
  const invite = await prisma.teamInvite.findUnique({
    where: { code: cleanCode },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!invite) {
    throw new AppError(404, 'Invalid invitation code');
  }

  if (invite.isRevoked) {
    throw new AppError(400, 'This invitation code has been revoked');
  }

  if (new Date() > invite.expiresAt) {
    throw new AppError(400, 'This invitation code has expired');
  }

  if (invite.usedCount >= invite.maxUses) {
    throw new AppError(409, 'This invitation code has already reached its usage limit');
  }

  if (invite.team.members.length >= invite.team.maxMembers) {
    throw new AppError(409, 'The target team is already full');
  }

  return {
    valid: true,
    code: invite.code,
    team: {
      id: invite.team.id,
      name: invite.team.name,
      description: invite.team.description,
      track: invite.team.track,
      maxMembers: invite.team.maxMembers,
      currentMembers: invite.team.members.length,
      members: invite.team.members,
    },
    expiresAt: invite.expiresAt,
    remainingUses: invite.maxUses - invite.usedCount,
  };
}

export async function getTeamInvites(userId: string, teamId: string) {
  const membership = await prisma.teamMember.findUnique({
    where: { userId },
  });

  if (!membership || membership.teamId !== teamId || membership.role !== MemberRole.LEADER) {
    throw new AppError(403, 'Only the team leader can view invitations');
  }

  return prisma.teamInvite.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
  });
}
