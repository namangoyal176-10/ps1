import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signToken } from '../src/utils/jwt.js';
import bcrypt from 'bcryptjs';

export const app = createApp();

export async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.joinRequest.deleteMany();
  await prisma.teamInvite.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(override: Partial<{
  email: string;
  username: string;
  fullName: string;
  skills: string[];
  timezone: string;
  timezoneOffset: number;
  lookingForTeam: boolean;
}> = {}) {
  const salt = await bcrypt.hash('Password123!', 6); // Faster salt in test
  const uniqueId = Math.random().toString(36).substring(2, 9);

  const user = await prisma.user.create({
    data: {
      email: override.email || `test_${uniqueId}@raceproof.dev`,
      username: override.username || `user_${uniqueId}`,
      fullName: override.fullName || `Test User ${uniqueId}`,
      passwordHash: salt,
      skills: override.skills || ['React', 'TypeScript'],
      timezone: override.timezone || 'UTC+0',
      timezoneOffset: override.timezoneOffset ?? 0.0,
      lookingForTeam: override.lookingForTeam ?? true,
    },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  return { user, token };
}
