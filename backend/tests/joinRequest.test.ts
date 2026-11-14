import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, clearDatabase, createTestUser } from './setup.js';
import { prisma } from '../src/config/prisma.js';

describe('Join Request API Tests', () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  it('should allow solo user to send join request to an open team', async () => {
    const { token: leaderToken } = await createTestUser();
    const { token: userToken, user } = await createTestUser();

    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Request Test Team',
        description: 'Team testing join requests.',
      });

    const teamId = teamRes.body.data.id;

    const res = await request(app)
      .post('/api/v1/join-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        teamId,
        message: 'I have 3 years of React and Node experience and would love to build together.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.teamId).toBe(teamId);
    expect(res.body.data.userId).toBe(user.id);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('should reject duplicate pending join request to the same team', async () => {
    const { token: leaderToken } = await createTestUser();
    const { token: userToken } = await createTestUser();

    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Duplicate Request Team',
        description: 'Team testing duplicate request prevention.',
      });

    const teamId = teamRes.body.data.id;

    await request(app)
      .post('/api/v1/join-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ teamId, message: 'First attempt' });

    const res = await request(app)
      .post('/api/v1/join-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ teamId, message: 'Second attempt' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already have a pending join request');
  });

  it('should allow leader to accept join request and admit member', async () => {
    const { token: leaderToken } = await createTestUser();
    const { token: userToken, user } = await createTestUser();

    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Approval Team',
        description: 'Team testing acceptance.',
      });

    const teamId = teamRes.body.data.id;

    const reqRes = await request(app)
      .post('/api/v1/join-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ teamId });

    const requestId = reqRes.body.data.id;

    const acceptRes = await request(app)
      .post(`/api/v1/join-requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);

    // Verify member exists in database
    const membership = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });
    expect(membership).toBeDefined();
    expect(membership?.teamId).toBe(teamId);
  });

  it('should allow leader to decline join request', async () => {
    const { token: leaderToken } = await createTestUser();
    const { token: userToken } = await createTestUser();

    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Decline Team',
        description: 'Team testing decline request.',
      });

    const teamId = teamRes.body.data.id;

    const reqRes = await request(app)
      .post('/api/v1/join-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ teamId });

    const requestId = reqRes.body.data.id;

    const declineRes = await request(app)
      .post(`/api/v1/join-requests/${requestId}/decline`)
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(declineRes.status).toBe(200);
    expect(declineRes.body.data.status).toBe('DECLINED');
  });

  it('should allow user to cancel their own join request', async () => {
    const { token: leaderToken } = await createTestUser();
    const { token: userToken } = await createTestUser();

    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Cancel Request Team',
        description: 'Team testing request cancellation.',
      });

    const teamId = teamRes.body.data.id;

    const reqRes = await request(app)
      .post('/api/v1/join-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ teamId });

    const requestId = reqRes.body.data.id;

    const cancelRes = await request(app)
      .delete(`/api/v1/join-requests/${requestId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
  });
});
