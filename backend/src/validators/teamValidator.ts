import { z } from 'zod';
import { TeamStatus } from '@prisma/client';

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Team name must be at least 3 characters').max(50),
    description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
    track: z.string().optional(),
    skillsNeeded: z.array(z.string()).optional(),
    maxMembers: z.number().int().min(2).max(10).optional(),
  }),
});

export const updateTeamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid team ID'),
  }),
  body: z.object({
    description: z.string().min(10).max(1000).optional(),
    track: z.string().optional(),
    skillsNeeded: z.array(z.string()).optional(),
    maxMembers: z.number().int().min(2).max(10).optional(),
    status: z.nativeEnum(TeamStatus).optional(),
  }),
});

export const getTeamsQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    track: z.string().optional(),
    skill: z.string().optional(),
    status: z.nativeEnum(TeamStatus).optional(),
    hasOpenSpots: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

export const transferLeadershipSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid team ID'),
  }),
  body: z.object({
    targetUserId: z.string().uuid('Invalid target user ID'),
  }),
});

export const kickMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid team ID'),
    userId: z.string().uuid('Invalid user ID to kick'),
  }),
});
