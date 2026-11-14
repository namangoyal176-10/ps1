import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, clearDatabase, createTestUser } from './setup.js';
import { prisma } from '../src/config/prisma.js';

describe('Authentication API Tests', () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  it('should register a new user successfully with HTTP-only cookie and token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'alice@raceproof.dev',
        username: 'alice_w',
        password: 'Password123!',
        fullName: 'Alice Walker',
        skills: ['React', 'TypeScript', 'Node.js'],
        timezone: 'UTC-5',
        timezoneOffset: -5.0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@raceproof.dev');
    expect(res.body.data.user.username).toBe('alice_w');
    expect(res.body.data.token).toBeDefined();

    // Check set-cookie header
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('token=');
    expect(cookies[0]).toContain('HttpOnly');
  });

  it('should reject registration with existing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'alice@raceproof.dev',
        username: 'alice_different',
        password: 'Password123!',
        fullName: 'Alice Duplicate',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('email already exists');
  });

  it('should reject registration with existing username', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'different@raceproof.dev',
        username: 'alice_w',
        password: 'Password123!',
        fullName: 'Another Alice',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Username is already taken');
  });

  it('should reject registration with invalid email or short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        username: 'bad_user',
        password: '123',
        fullName: 'Bad User',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should log in successfully with email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        login: 'alice@raceproof.dev',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@raceproof.dev');
    expect(res.body.data.token).toBeDefined();
  });

  it('should log in successfully with username', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        login: 'alice_w',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('alice_w');
  });

  it('should reject login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        login: 'alice_w',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid credentials');
  });

  it('should fetch current authenticated user profile (/auth/me)', async () => {
    const { token, user } = await createTestUser();

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.email).toBe(user.email);
  });

  it('should reject /auth/me without valid token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('should update user profile successfully', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bio: 'Updated bio for testing',
        skills: ['Rust', 'PostgreSQL'],
        timezone: 'UTC+2',
        timezoneOffset: 2.0,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.bio).toBe('Updated bio for testing');
    expect(res.body.data.skills).toContain('Rust');
  });
});
