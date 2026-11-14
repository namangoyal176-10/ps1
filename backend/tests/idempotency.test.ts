import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, clearDatabase, createTestUser } from './setup.js';
import { prisma } from '../src/config/prisma.js';

describe('Idempotency Key Middleware Tests', () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  it('should return identical cached response when repeating request with same Idempotency-Key', async () => {
    const { token } = await createTestUser();
    const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // First request
    const firstRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        name: 'Idempotent Alpha Team',
        description: 'First attempt with idempotency key.',
      });

    expect(firstRes.status).toBe(201);
    expect(firstRes.headers['x-cache-lookup']).toBe('MISS');
    const createdTeamId = firstRes.body.data.id;

    // Second request with same idempotency key and same body
    const secondRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        name: 'Idempotent Alpha Team',
        description: 'First attempt with idempotency key.',
      });

    expect(secondRes.status).toBe(201);
    expect(secondRes.headers['x-cache-lookup']).toBe('HIT');
    expect(secondRes.body.data.id).toBe(createdTeamId);

    // Verify only ONE team was actually created in the database
    const teamCount = await prisma.team.count({
      where: { name: 'Idempotent Alpha Team' },
    });
    expect(teamCount).toBe(1);
  });
});
