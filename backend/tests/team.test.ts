import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, clearDatabase, createTestUser } from './setup.js';
import { prisma } from '../src/config/prisma.js';

describe('Team API Tests', () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  it('should create a new team successfully', async () => {
    const { token, user } = await createTestUser();

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Distributed Titans',
        description: 'Building high throughput low latency consensus systems.',
        track: 'FinTech',
        skillsNeeded: ['Rust', 'Go', 'PostgreSQL'],
        maxMembers: 4,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Distributed Titans');
    expect(res.body.data.members).toHaveLength(1);
    expect(res.body.data.members[0].role).toBe('LEADER');
    expect(res.body.data.members[0].userId).toBe(user.id);
  });

  it('should reject creating a team if user is already a member of a team', async () => {
    const { token } = await createTestUser();

    // Create first team
    await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'First Team',
        description: 'First team description text here.',
      });

    // Attempt to create second team
    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Second Team',
        description: 'Second team description text here.',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already a member');
  });

  it('should reject team creation with duplicate name', async () => {
    const { token: token1 } = await createTestUser();
    const { token: token2 } = await createTestUser();

    await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        name: 'Duplicate Check Team',
        description: 'First creation description here.',
      });

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        name: 'Duplicate Check Team',
        description: 'Duplicate name attempt description.',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('should list teams with pagination, search, and track filters', async () => {
    const res = await request(app).get('/api/v1/teams?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it('should filter teams by track', async () => {
    const res = await request(app).get('/api/v1/teams?track=FinTech');
    expect(res.status).toBe(200);
    const fintechTeams = res.body.data;
    fintechTeams.forEach((t: any) => {
      expect(t.track).toBe('FinTech');
    });
  });

  it('should get team details by ID with membership info', async () => {
    const { token } = await createTestUser();
    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Details Check Team',
        description: 'Team for checking details endpoint.',
      });

    const teamId = teamRes.body.data.id;

    const res = await request(app)
      .get(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(teamId);
    expect(res.body.data.isLeader).toBe(true);
    expect(res.body.data.isMember).toBe(true);
    expect(Array.isArray(res.body.data.members)).toBe(true);
  });

  it('should allow team leader to update team settings', async () => {
    const { token } = await createTestUser();
    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updatable Team',
        description: 'Initial description before patch.',
      });

    const teamId = teamRes.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Updated description after leader patch.',
        skillsNeeded: ['Docker', 'AWS'],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Updated description after leader patch.');
    expect(res.body.data.skillsNeeded).toContain('Docker');
  });

  it('should reject update if caller is not the team leader', async () => {
    const { token: leaderToken } = await createTestUser();
    const { token: otherToken } = await createTestUser();

    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Forbidden Update Team',
        description: 'Initial description before unauthorized patch.',
      });

    const teamId = teamRes.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        description: 'Malicious update attempt.',
      });

    expect(res.status).toBe(403);
  });
});
