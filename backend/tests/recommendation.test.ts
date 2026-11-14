import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, clearDatabase, createTestUser } from './setup.js';
import { prisma } from '../src/config/prisma.js';
import { MemberRole } from '@prisma/client';

describe('Teammate & Team Recommendation Tests', () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  it('should recommend teammates based on skills and timezone proximity', async () => {
    // 1. Create team leader at UTC-5 seeking ['Python', 'PyTorch', 'FastAPI']
    const { user: leader, token: leaderToken } = await createTestUser({
      skills: ['Python', 'PyTorch'],
      timezone: 'UTC-5',
      timezoneOffset: -5.0,
    });

    const team = await prisma.team.create({
      data: {
        name: 'AI Match Team',
        description: 'Building LLM agents.',
        skillsNeeded: ['Python', 'PyTorch', 'FastAPI'],
        members: {
          create: [{ userId: leader.id, role: MemberRole.LEADER }],
        },
      },
    });

    // 2. Candidate A: Perfect skills, same timezone (UTC-5)
    await createTestUser({
      skills: ['Python', 'PyTorch', 'FastAPI'],
      timezone: 'UTC-5',
      timezoneOffset: -5.0,
      lookingForTeam: true,
    });

    // 3. Candidate B: Partial skills, opposite timezone (UTC+8)
    await createTestUser({
      skills: ['Python'],
      timezone: 'UTC+8',
      timezoneOffset: 8.0,
      lookingForTeam: true,
    });

    const res = await request(app)
      .get(`/api/v1/recommendations/team/${team.id}`)
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    // Candidate A must rank higher than Candidate B
    const firstMatch = res.body.data[0];
    const secondMatch = res.body.data[1];

    expect(firstMatch.matchScore).toBeGreaterThan(secondMatch.matchScore);
    expect(firstMatch.matchingSkills).toContain('Python');
    expect(firstMatch.matchingSkills).toContain('PyTorch');
  });

  it('should recommend open teams to solo participants', async () => {
    const { token: userToken } = await createTestUser({
      skills: ['Rust', 'Solidity'],
      timezoneOffset: 0.0,
    });

    const res = await request(app)
      .get('/api/v1/recommendations/user/teams')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
