import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, clearDatabase, createTestUser } from './setup.js';
import { prisma } from '../src/config/prisma.js';
import { MemberRole } from '@prisma/client';

describe('Team Lifecycle & Leadership Transfer Tests', () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  it('should automatically transfer leadership to next senior member when leader leaves', async () => {
    // Create leader and 2 members
    const { user: leader, token: leaderToken } = await createTestUser();
    const { user: seniorMember } = await createTestUser();
    const { user: juniorMember } = await createTestUser();

    const team = await prisma.team.create({
      data: {
        name: 'Auto Leadership Team',
        description: 'Testing automatic leadership transfer.',
        members: {
          create: [
            { userId: leader.id, role: MemberRole.LEADER, joinedAt: new Date(Date.now() - 5000) },
            { userId: seniorMember.id, role: MemberRole.MEMBER, joinedAt: new Date(Date.now() - 3000) },
            { userId: juniorMember.id, role: MemberRole.MEMBER, joinedAt: new Date(Date.now() - 1000) },
          ],
        },
      },
    });

    // Leader leaves team
    const leaveRes = await request(app)
      .post(`/api/v1/teams/${team.id}/leave`)
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.data.action).toBe('MEMBER_LEFT');
    expect(leaveRes.body.data.newLeaderId).toBe(seniorMember.id);

    // Verify database state: seniorMember is now LEADER
    const updatedSenior = await prisma.teamMember.findUnique({
      where: { userId: seniorMember.id },
    });
    expect(updatedSenior?.role).toBe(MemberRole.LEADER);

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: { teamId: team.id, action: 'LEADERSHIP_TRANSFERRED' },
    });
    expect(audit).toBeDefined();
    expect((audit?.details as any).newLeaderId).toBe(seniorMember.id);
  });

  it('should automatically delete the team when the last member leaves', async () => {
    const { user: soloLeader, token: soloToken } = await createTestUser();

    const team = await prisma.team.create({
      data: {
        name: 'Ephemeral Team',
        description: 'Single member team that should delete upon leaving.',
        members: {
          create: [{ userId: soloLeader.id, role: MemberRole.LEADER }],
        },
      },
    });

    const leaveRes = await request(app)
      .post(`/api/v1/teams/${team.id}/leave`)
      .set('Authorization', `Bearer ${soloToken}`);

    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.data.action).toBe('TEAM_DELETED');

    // Verify team is deleted from database
    const teamInDb = await prisma.team.findUnique({
      where: { id: team.id },
    });
    expect(teamInDb).toBeNull();
  });

  it('should allow leader to explicitly transfer leadership to another member', async () => {
    const { user: leader, token: leaderToken } = await createTestUser();
    const { user: member } = await createTestUser();

    const team = await prisma.team.create({
      data: {
        name: 'Explicit Transfer Team',
        description: 'Testing explicit role delegation.',
        members: {
          create: [
            { userId: leader.id, role: MemberRole.LEADER },
            { userId: member.id, role: MemberRole.MEMBER },
          ],
        },
      },
    });

    const res = await request(app)
      .post(`/api/v1/teams/${team.id}/transfer-leadership`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ targetUserId: member.id });

    expect(res.status).toBe(200);

    const newLeader = await prisma.teamMember.findUnique({ where: { userId: member.id } });
    const oldLeader = await prisma.teamMember.findUnique({ where: { userId: leader.id } });

    expect(newLeader?.role).toBe(MemberRole.LEADER);
    expect(oldLeader?.role).toBe(MemberRole.MEMBER);
  });

  it('should allow leader to kick a member from team', async () => {
    const { user: leader, token: leaderToken } = await createTestUser();
    const { user: member } = await createTestUser();

    const team = await prisma.team.create({
      data: {
        name: 'Kick Test Team',
        description: 'Testing kicking members.',
        members: {
          create: [
            { userId: leader.id, role: MemberRole.LEADER },
            { userId: member.id, role: MemberRole.MEMBER },
          ],
        },
      },
    });

    const res = await request(app)
      .delete(`/api/v1/teams/${team.id}/members/${member.id}`)
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(res.status).toBe(200);

    const kickedMembership = await prisma.teamMember.findUnique({
      where: { userId: member.id },
    });
    expect(kickedMembership).toBeNull();

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: { teamId: team.id, action: 'MEMBER_KICKED' },
    });
    expect(audit).toBeDefined();
  });
});
