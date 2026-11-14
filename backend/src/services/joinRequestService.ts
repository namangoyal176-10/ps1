import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { MemberRole, RequestStatus, TeamStatus } from '@prisma/client';
import { logAudit } from './auditService.js';
import { emitToTeam, emitToUser, emitToDiscovery } from './socketService.js';

export interface CreateJoinRequestDTO {
  teamId: string;
  message?: string;
}

export async function createJoinRequest(userId: string, dto: CreateJoinRequestDTO) {
  // Check if user is already in a team
  const existingMembership = await prisma.teamMember.findUnique({
    where: { userId },
  });
  if (existingMembership) {
    throw new AppError(409, 'You are already a member of a team');
  }

  // Check if team exists and is open
  const team = await prisma.team.findUnique({
    where: { id: dto.teamId },
    include: { _count: { select: { members: true } } },
  });

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  if (team.status === TeamStatus.LOCKED) {
    throw new AppError(400, 'Team is locked');
  }

  if (team._count.members >= team.maxMembers) {
    throw new AppError(409, 'Team is already at maximum capacity');
  }

  // Check for existing pending request
  const existingRequest = await prisma.joinRequest.findFirst({
    where: {
      teamId: dto.teamId,
      userId,
      status: RequestStatus.PENDING,
    },
  });

  if (existingRequest) {
    throw new AppError(409, 'You already have a pending join request for this team');
  }

  const joinRequest = await prisma.joinRequest.create({
    data: {
      teamId: dto.teamId,
      userId,
      message: dto.message?.trim() || null,
      status: RequestStatus.PENDING,
    },
    include: {
      team: { select: { id: true, name: true } },
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          skills: true,
          timezone: true,
        },
      },
    },
  });

  await logAudit({
    teamId: dto.teamId,
    actorId: userId,
    action: 'REQUEST_SENT',
    details: { requestId: joinRequest.id, message: dto.message },
  });

  emitToTeam(dto.teamId, 'join_request_received', joinRequest);

  return joinRequest;
}

/**
 * CRITICAL RACE-PROOF ACCEPT JOIN REQUEST:
 * Executes row-level locking on the Team row so concurrent approvals or joins never exceed capacity.
 */
export async function acceptJoinRequest(leaderUserId: string, requestId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch Request
    const request = await tx.joinRequest.findUnique({
      where: { id: requestId },
      include: { team: true },
    });

    if (!request) {
      throw new AppError(404, 'Join request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new AppError(400, `Join request has already been ${request.status.toLowerCase()}`);
    }

    const teamId = request.teamId;
    const applicantUserId = request.userId;

    // 2. Verify caller is team leader
    const leaderMembership = await tx.teamMember.findUnique({
      where: { userId: leaderUserId },
    });

    if (!leaderMembership || leaderMembership.teamId !== teamId || leaderMembership.role !== MemberRole.LEADER) {
      throw new AppError(403, 'Only the team leader can accept join requests');
    }

    // 3. Acquire exclusive row lock on Team
    const lockedTeams: Array<{ id: string; name: string; maxMembers: number; status: string }> =
      await tx.$queryRaw`SELECT id, name, "maxMembers", status FROM "Team" WHERE id = ${teamId} FOR UPDATE`;

    if (!lockedTeams || lockedTeams.length === 0) {
      throw new AppError(404, 'Team not found');
    }
    const team = lockedTeams[0];

    // 4. Count members inside locked transaction
    const currentMemberCount = await tx.teamMember.count({
      where: { teamId },
    });

    if (currentMemberCount >= team.maxMembers) {
      await tx.team.update({
        where: { id: teamId },
        data: { status: TeamStatus.FULL },
      });
      // Mark this request declined since team is full
      await tx.joinRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.DECLINED },
      });
      throw new AppError(409, `Team is full (${currentMemberCount}/${team.maxMembers} seats occupied)`);
    }

    // 5. Verify applicant isn't already in another team
    const existingMembership = await tx.teamMember.findUnique({
      where: { userId: applicantUserId },
    });

    if (existingMembership) {
      await tx.joinRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.CANCELLED },
      });
      throw new AppError(409, 'Applicant has already joined another team');
    }

    // 6. Update request status to ACCEPTED
    await tx.joinRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.ACCEPTED },
    });

    // 7. Insert TeamMember
    const newMember = await tx.teamMember.create({
      data: {
        teamId,
        userId: applicantUserId,
        role: MemberRole.MEMBER,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            skills: true,
            timezone: true,
          },
        },
      },
    });

    // 8. Update applicant profile flag
    await tx.user.update({
      where: { id: applicantUserId },
      data: { lookingForTeam: false },
    });

    // 9. Cancel applicant's other pending requests
    await tx.joinRequest.updateMany({
      where: { userId: applicantUserId, status: RequestStatus.PENDING },
      data: { status: RequestStatus.CANCELLED },
    });

    // 10. If team capacity reached, update status and auto-decline other pending requests
    const newCount = currentMemberCount + 1;
    if (newCount >= team.maxMembers) {
      await tx.team.update({
        where: { id: teamId },
        data: { status: TeamStatus.FULL },
      });

      await tx.joinRequest.updateMany({
        where: { teamId, status: RequestStatus.PENDING },
        data: { status: RequestStatus.DECLINED },
      });
    }

    // 11. Audit log
    await logAudit({
      teamId,
      actorId: leaderUserId,
      action: 'REQUEST_ACCEPTED',
      details: {
        requestId,
        applicantUserId,
        newMemberCount: newCount,
        maxMembers: team.maxMembers,
      },
      tx,
    });

    return {
      teamId,
      applicantUserId,
      newMember,
      newMemberCount: newCount,
      maxMembers: team.maxMembers,
    };
  }, {
    timeout: 15000,
  }).then((res) => {
    emitToUser(res.applicantUserId, 'join_request_status', {
      requestId,
      status: 'ACCEPTED',
      teamId: res.teamId,
    });
    emitToTeam(res.teamId, 'member_joined', {
      teamId: res.teamId,
      member: res.newMember,
      memberCount: res.newMemberCount,
    });
    emitToDiscovery('team_updated', {
      id: res.teamId,
      memberCount: res.newMemberCount,
      status: res.newMemberCount >= res.maxMembers ? 'FULL' : 'OPEN',
    });
    return res;
  });
}

export async function declineJoinRequest(leaderUserId: string, requestId: string) {
  const request = await prisma.joinRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new AppError(404, 'Join request not found');
  }

  const leaderMembership = await prisma.teamMember.findUnique({
    where: { userId: leaderUserId },
  });

  if (!leaderMembership || leaderMembership.teamId !== request.teamId || leaderMembership.role !== MemberRole.LEADER) {
    throw new AppError(403, 'Only the team leader can decline join requests');
  }

  const updated = await prisma.joinRequest.update({
    where: { id: requestId },
    data: { status: RequestStatus.DECLINED },
  });

  await logAudit({
    teamId: request.teamId,
    actorId: leaderUserId,
    action: 'REQUEST_DECLINED',
    details: { requestId, applicantUserId: request.userId },
  });

  emitToUser(request.userId, 'join_request_status', {
    requestId,
    status: 'DECLINED',
    teamId: request.teamId,
  });

  return updated;
}

export async function cancelJoinRequest(userId: string, requestId: string) {
  const request = await prisma.joinRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new AppError(404, 'Join request not found');
  }

  if (request.userId !== userId) {
    throw new AppError(403, 'You can only cancel your own join requests');
  }

  const updated = await prisma.joinRequest.update({
    where: { id: requestId },
    data: { status: RequestStatus.CANCELLED },
  });

  await logAudit({
    teamId: request.teamId,
    actorId: userId,
    action: 'REQUEST_CANCELLED',
    details: { requestId },
  });

  return updated;
}

export async function getUserJoinRequests(userId: string) {
  return prisma.joinRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          description: true,
          track: true,
          status: true,
          maxMembers: true,
          _count: { select: { members: true } },
        },
      },
    },
  });
}
