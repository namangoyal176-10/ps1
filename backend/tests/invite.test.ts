import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, clearDatabase, createTestUser } from './setup.js';
import { prisma } from '../src/config/prisma.js';

describe('Invitation API Tests', () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  it('should generate secure invitation code by team leader', async () => {
    const { token: leaderToken } = await createTestUser();
    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Invite Test Team',
        description: 'Testing team invites generation.',
      });

    const teamId = teamRes.body.data.id;

    const res = await request(app)
      .post('/api/v1/invites')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        teamId,
        maxUses: 5,
        expiresInHours: 48,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBeDefined();
    expect(res.body.data.code.length).toBeGreaterThanOrEqual(8);
    expect(res.body.data.maxUses).toBe(5);
  });

  it('should reject invite code generation by non-leader', async () => {
    const { token: leaderToken } = await createTestUser();
    const { token: otherToken } = await createTestUser();

    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Non Leader Invite Team',
        description: 'Team testing unauthorized invites.',
      });

    const teamId = teamRes.body.data.id;

    const res = await request(app)
      .post('/api/v1/invites')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ teamId });

    expect(res.status).toBe(403);
  });

  it('should validate an invite code and return team preview', async () => {
    const { token: leaderToken } = await createTestUser();
    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Validation Test Team',
        description: 'Team for testing code validation.',
      });

    const inviteRes = await request(app)
      .post('/api/v1/invites')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ teamId: teamRes.body.data.id });

    const code = inviteRes.body.data.code;

    const res = await request(app).get(`/api/v1/invites/validate/${code}`);
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.team.name).toBe('Validation Test Team');
  });

  it('should allow leader to revoke an invite code', async () => {
    const { token: leaderToken } = await createTestUser();
    const { token: soloToken } = await createTestUser();

    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Revoke Test Team',
        description: 'Team for testing revoke.',
      });

    const inviteRes = await request(app)
      .post('/api/v1/invites')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ teamId: teamRes.body.data.id });

    const inviteId = inviteRes.body.data.id;
    const code = inviteRes.body.data.code;

    // Revoke
    const revokeRes = await request(app)
      .delete(`/api/v1/invites/${inviteId}`)
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.isRevoked).toBe(true);

    // Attempt to join with revoked code
    const joinRes = await request(app)
      .post('/api/v1/teams/join-with-code')
      .set('Authorization', `Bearer ${soloToken}`)
      .send({ code });

    expect(joinRes.status).toBe(400);
    expect(joinRes.body.error).toContain('revoked');
  });
});
