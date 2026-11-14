import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { TeamStatus, MemberRole, Prisma } from '@prisma/client';
import { logAudit } from './auditService.js';
import { emitToTeam, emitToUser, emitToDiscovery } from './socketService.js';

export interface CreateTeamDTO {
  name: string;
  description: string;
  track?: string;
  skillsNeeded?: string[];
  maxMembers?: number;
}

export interface UpdateTeamDTO {
  description?: string;
  track?: string;
  skillsNeeded?: string[];
  maxMembers?: number;
  status?: TeamStatus;
}

export interface GetTeamsQuery {
  search?: string;
  track?: string;
  skill?: string;
  status?: TeamStatus;
  hasOpenSpots?: boolean;
  page?: number;
  limit?: number;
}

export async function createTeam(userId: string, dto: CreateTeamDTO) {
  // Check if user is already in a team
  const existingMembership = await prisma.teamMember.findUnique({
    where: { userId },
    include: { team: true },
  });

  if (existingMembership) {
    throw new AppError(409, `You are already a member of team "${existingMembership.team.name}". Leave your current team first.`);
  }

  // Check unique team name
  const existingTeam = await prisma.team.findUnique({
    where: { name: dto.name.trim() },
  });
  if (existingTeam) {
    throw new AppError(409, `A team with name "${dto.name}" already exists.`);
  }

  const maxMembers = dto.maxMembers && dto.maxMembers >= 2 && dto.maxMembers <= 10 ? dto.maxMembers : 4;

  const team = await prisma.$transaction(async (tx) => {
    const createdTeam = await tx.team.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        track: dto.track?.trim() || 'General',
        skillsNeeded: dto.skillsNeeded || [],
        maxMembers,
        status: TeamStatus.OPEN,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: createdTeam.id,
        userId,
        role: MemberRole.LEADER,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { lookingForTeam: false },
    });

    await logAudit({
      teamId: createdTeam.id,
      actorId: userId,
      action: 'TEAM_CREATED',
      details: {
        name: createdTeam.name,
        track: createdTeam.track,
        maxMembers: createdTeam.maxMembers,
      },
      tx,
    });

    return createdTeam;
  });

  const fullTeam = await getTeamById(team.id, userId);
  emitToDiscovery('team_created', { team: fullTeam });

  return fullTeam;
}

export async function getTeams(query: GetTeamsQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, Math.max(1, query.limit || 12));
  const skip = (page - 1) * limit;

  const where: Prisma.TeamWhereInput = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.track && query.track !== 'All' && query.track !== 'General Track') {
    where.track = { equals: query.track, mode: 'insensitive' };
  }

  if (query.skill) {
    where.skillsNeeded = { has: query.skill };
  }

  if (query.status) {
    where.status = query.status;
  }

  const [total, teams] = await Promise.all([
    prisma.team.count({ where }),
    prisma.team.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
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
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    }),
  ]);

  // Filter in-memory if hasOpenSpots is requested
  let filteredTeams = teams;
  if (query.hasOpenSpots) {
    filteredTeams = teams.filter((t) => t.members.length < t.maxMembers && t.status === TeamStatus.OPEN);
  }

  return {
    teams: filteredTeams,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTeamById(teamId: string, currentUserId?: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        orderBy: { joinedAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
              bio: true,
              skills: true,
              timezone: true,
              timezoneOffset: true,
              githubUrl: true,
              portfolioUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const isLeader = team.members.some((m) => m.userId === currentUserId && m.role === MemberRole.LEADER);
  const isMember = team.members.some((m) => m.userId === currentUserId);

  let activeInvites: any[] = [];
  let pendingRequests: any[] = [];

  if (isLeader) {
    [activeInvites, pendingRequests] = await Promise.all([
      prisma.teamInvite.findMany({
        where: {
          teamId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.joinRequest.findMany({
        where: {
          teamId,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
              bio: true,
              skills: true,
              timezone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
  }

  return {
    ...team,
    isLeader,
    isMember,
    activeInvites,
    pendingRequests,
  };
}

export async function updateTeam(teamId: string, userId: string, dto: UpdateTeamDTO) {
  const membership = await prisma.teamMember.findUnique({
    where: { userId },
  });

  if (!membership || membership.teamId !== teamId || membership.role !== MemberRole.LEADER) {
    throw new AppError(403, 'Only the team leader can update team settings');
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { _count: { select: { members: true } } },
  });

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  if (dto.maxMembers && dto.maxMembers < team._count.members) {
    throw new AppError(400, `Cannot set maximum members below current member count (${team._count.members})`);
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(dto.description && { description: dto.description.trim() }),
      ...(dto.track && { track: dto.track.trim() }),
      ...(dto.skillsNeeded && { skillsNeeded: dto.skillsNeeded }),
      ...(dto.maxMembers && { maxMembers: dto.maxMembers }),
      ...(dto.status && { status: dto.status }),
    },
  });

  await logAudit({
    teamId,
    actorId: userId,
    action: 'TEAM_UPDATED',
    details: dto as unknown as Prisma.InputJsonObject,
  });

  emitToTeam(teamId, 'team_updated', updated);
  emitToDiscovery('team_updated', updated);

  return updated;
}

/**
 * CRITICAL RACE-PROOF IMPLEMENTATION:
 * Direct join using a secure invitation code with PostgreSQL row-level locking.
 */
export async function joinTeamWithInviteCode(userId: string, code: string) {
  const cleanCode = code.trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    // 1. Fetch and Lock the Invite Code row
    const lockedInvites: Array<{
      id: string;
      teamId: string;
      code: string;
      maxUses: number;
      usedCount: number;
      expiresAt: Date;
      isRevoked: boolean;
    }> = await tx.$queryRaw`
      SELECT id, "teamId", code, "maxUses", "usedCount", "expiresAt", "isRevoked"
      FROM "TeamInvite"
      WHERE code = ${cleanCode}
      FOR UPDATE
    `;

    if (!lockedInvites || lockedInvites.length === 0) {
      throw new AppError(404, 'Invalid invitation code');
    }

    const invite = lockedInvites[0];

    if (invite.isRevoked) {
      throw new AppError(400, 'This invitation code has been revoked');
    }

    if (new Date() > new Date(invite.expiresAt)) {
      throw new AppError(400, 'This invitation code has expired');
    }

    if (invite.usedCount >= invite.maxUses) {
      throw new AppError(409, 'This invitation code has reached its maximum usage limit');
    }

    // 2. Fetch and Lock the Team row
    const lockedTeams: Array<{
      id: string;
      name: string;
      maxMembers: number;
      status: string;
    }> = await tx.$queryRaw`
      SELECT id, name, "maxMembers", status
      FROM "Team"
      WHERE id = ${invite.teamId}
      FOR UPDATE
    `;

    if (!lockedTeams || lockedTeams.length === 0) {
      throw new AppError(404, 'Team no longer exists');
    }

    const team = lockedTeams[0];

    if (team.status === 'LOCKED') {
      throw new AppError(400, 'Team is currently locked and not accepting new members');
    }

    // 3. Check current member count
    const currentMemberCount = await tx.teamMember.count({
      where: { teamId: team.id },
    });

    if (currentMemberCount >= team.maxMembers) {
      // Mark team as FULL if not already marked
      await tx.team.update({
        where: { id: team.id },
        data: { status: TeamStatus.FULL },
      });
      throw new AppError(409, `Team is full (${currentMemberCount}/${team.maxMembers} seats occupied)`);
    }

    // 4. Check if user is already in any team
    const existingMembership = await tx.teamMember.findUnique({
      where: { userId },
    });

    if (existingMembership) {
      throw new AppError(409, 'You are already a member of a team. Leave your current team first.');
    }

    // 5. Increment invite usage count
    await tx.teamInvite.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    });

    // 6. Insert new TeamMember
    const newMember = await tx.teamMember.create({
      data: {
        teamId: team.id,
        userId,
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

    // 7. Update user's lookingForTeam flag
    await tx.user.update({
      where: { id: userId },
      data: { lookingForTeam: false },
    });

    // 8. Auto-cancel user's pending join requests to other teams
    await tx.joinRequest.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // 9. If team is now full, update status and auto-decline pending requests
    const newCount = currentMemberCount + 1;
    if (newCount >= team.maxMembers) {
      await tx.team.update({
        where: { id: team.id },
        data: { status: TeamStatus.FULL },
      });

      await tx.joinRequest.updateMany({
        where: { teamId: team.id, status: 'PENDING' },
        data: { status: 'DECLINED' },
      });
    }

    // 10. Audit log
    await logAudit({
      teamId: team.id,
      actorId: userId,
      action: 'MEMBER_JOINED',
      details: {
        method: 'INVITE_CODE',
        inviteCode: cleanCode,
        newMemberCount: newCount,
        maxMembers: team.maxMembers,
      },
      tx,
    });

    return {
      teamId: team.id,
      teamName: team.name,
      member: newMember,
      newMemberCount: newCount,
      maxMembers: team.maxMembers,
    };
  }, {
    timeout: 15000,
  }).then((result) => {
    emitToTeam(result.teamId, 'member_joined', {
      teamId: result.teamId,
      member: result.member,
      memberCount: result.newMemberCount,
    });
    emitToDiscovery('team_updated', {
      id: result.teamId,
      memberCount: result.newMemberCount,
      status: result.newMemberCount >= result.maxMembers ? 'FULL' : 'OPEN',
    });
    return result;
  });
}

/**
 * Leave Team with automatic leadership transfer & automatic team deletion when empty!
 */
export async function leaveTeam(userId: string, targetTeamId?: string) {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.teamMember.findUnique({
      where: { userId },
      include: { team: true },
    });

    if (!membership) {
      throw new AppError(404, 'You are not currently a member of any team');
    }

    const teamId = membership.teamId;
    if (targetTeamId && targetTeamId !== teamId) {
      throw new AppError(400, 'Specified team does not match your active membership');
    }

    // Lock the Team row
    const lockedTeams: Array<{ id: string; name: string; maxMembers: number; status: string }> =
      await tx.$queryRaw`SELECT id, name, "maxMembers", status FROM "Team" WHERE id = ${teamId} FOR UPDATE`;

    if (!lockedTeams || lockedTeams.length === 0) {
      throw new AppError(404, 'Team not found');
    }
    const team = lockedTeams[0];

    // Find all remaining members
    const otherMembers = await tx.teamMember.findMany({
      where: { teamId, userId: { not: userId } },
      orderBy: { joinedAt: 'asc' }, // Oldest member first for auto-promotion
    });

    // Delete current user's membership
    await tx.teamMember.delete({
      where: { userId },
    });

    // Reset user's lookingForTeam flag
    await tx.user.update({
      where: { id: userId },
      data: { lookingForTeam: true },
    });

    await logAudit({
      teamId,
      actorId: userId,
      action: 'MEMBER_LEFT',
      details: { username: membership.userId, role: membership.role },
      tx,
    });

    // Scenario A: Last member leaves -> AUTO-DELETE TEAM
    if (otherMembers.length === 0) {
      await logAudit({
        teamId: null, // Team is being deleted
        actorId: userId,
        action: 'TEAM_DELETED',
        details: { teamId, name: team.name, reason: 'Last member left' },
        tx,
      });

      await tx.team.delete({
        where: { id: teamId },
      });

      return {
        action: 'TEAM_DELETED',
        teamId,
        message: 'You left the team. As the last member, the team has been automatically deleted.',
      };
    }

    // Scenario B: Leader leaves and other members remain -> LEADERSHIP TRANSFER
    let newLeaderId: string | null = null;
    if (membership.role === MemberRole.LEADER) {
      const successor = otherMembers[0]; // Earliest joined member
      await tx.teamMember.update({
        where: { id: successor.id },
        data: { role: MemberRole.LEADER },
      });

      newLeaderId = successor.userId;

      await logAudit({
        teamId,
        actorId: userId,
        action: 'LEADERSHIP_TRANSFERRED',
        details: {
          previousLeaderId: userId,
          newLeaderId: successor.userId,
          reason: 'Previous leader left team',
        },
        tx,
      });
    }

    // If team was FULL, re-open it since a seat became available
    if (team.status === 'FULL') {
      await tx.team.update({
        where: { id: teamId },
        data: { status: TeamStatus.OPEN },
      });
    }

    return {
      action: 'MEMBER_LEFT',
      teamId,
      newLeaderId,
      remainingCount: otherMembers.length,
      message: newLeaderId
        ? 'You left the team. Leadership was automatically transferred to the next senior member.'
        : 'You left the team successfully.',
    };
  }, {
    timeout: 15000,
  }).then((result) => {
    if (result.action === 'TEAM_DELETED') {
      emitToDiscovery('team_deleted', { teamId: result.teamId });
    } else {
      emitToTeam(result.teamId, 'member_left', {
        userId,
        newLeaderId: result.newLeaderId,
        memberCount: result.remainingCount,
      });
      emitToDiscovery('team_updated', {
        id: result.teamId,
        memberCount: result.remainingCount,
        status: 'OPEN',
      });
    }
    return result;
  });
}

/**
 * Transfer leadership explicitly to another existing member
 */
export async function transferLeadership(leaderUserId: string, teamId: string, targetUserId: string) {
  if (leaderUserId === targetUserId) {
    throw new AppError(400, 'You are already the leader');
  }

  return prisma.$transaction(async (tx) => {
    const leaderMembership = await tx.teamMember.findUnique({
      where: { userId: leaderUserId },
    });

    if (!leaderMembership || leaderMembership.teamId !== teamId || leaderMembership.role !== MemberRole.LEADER) {
      throw new AppError(403, 'Only the current team leader can transfer leadership');
    }

    const targetMembership = await tx.teamMember.findUnique({
      where: { userId: targetUserId },
    });

    if (!targetMembership || targetMembership.teamId !== teamId) {
      throw new AppError(404, 'Target member is not part of this team');
    }

    await tx.teamMember.update({
      where: { userId: leaderUserId },
      data: { role: MemberRole.MEMBER },
    });

    await tx.teamMember.update({
      where: { userId: targetUserId },
      data: { role: MemberRole.LEADER },
    });

    await logAudit({
      teamId,
      actorId: leaderUserId,
      action: 'LEADERSHIP_TRANSFERRED',
      details: {
        fromUserId: leaderUserId,
        toUserId: targetUserId,
      },
      tx,
    });

    return { success: true, newLeaderId: targetUserId };
  }).then((res) => {
    emitToTeam(teamId, 'leadership_transferred', {
      previousLeaderId: leaderUserId,
      newLeaderId: targetUserId,
    });
    return res;
  });
}

/**
 * Kick a member (leader only)
 */
export async function kickMember(leaderUserId: string, teamId: string, memberUserId: string) {
  if (leaderUserId === memberUserId) {
    throw new AppError(400, 'Leader cannot kick themselves. Use leave team instead.');
  }

  return prisma.$transaction(async (tx) => {
    const leaderMembership = await tx.teamMember.findUnique({
      where: { userId: leaderUserId },
    });

    if (!leaderMembership || leaderMembership.teamId !== teamId || leaderMembership.role !== MemberRole.LEADER) {
      throw new AppError(403, 'Only the team leader can kick members');
    }

    const memberToKick = await tx.teamMember.findUnique({
      where: { userId: memberUserId },
    });

    if (!memberToKick || memberToKick.teamId !== teamId) {
      throw new AppError(404, 'Member not found in this team');
    }

    await tx.teamMember.delete({
      where: { userId: memberUserId },
    });

    await tx.user.update({
      where: { id: memberUserId },
      data: { lookingForTeam: true },
    });

    // If team was FULL, reset to OPEN
    await tx.team.update({
      where: { id: teamId },
      data: { status: TeamStatus.OPEN },
    });

    await logAudit({
      teamId,
      actorId: leaderUserId,
      action: 'MEMBER_KICKED',
      details: { kickedUserId: memberUserId },
      tx,
    });

    const remainingCount = await tx.teamMember.count({ where: { teamId } });

    return { kickedUserId: memberUserId, remainingCount };
  }).then((result) => {
    emitToUser(memberUserId, 'kicked_from_team', { teamId });
    emitToTeam(teamId, 'member_kicked', {
      kickedUserId: memberUserId,
      memberCount: result.remainingCount,
    });
    emitToDiscovery('team_updated', {
      id: teamId,
      memberCount: result.remainingCount,
      status: 'OPEN',
    });
    return result;
  });
}
