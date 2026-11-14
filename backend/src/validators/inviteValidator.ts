import { z } from 'zod';

export const createInviteSchema = z.object({
  body: z.object({
    teamId: z.string().uuid('Invalid team ID'),
    maxUses: z.number().int().min(1).max(100).optional(),
    expiresInHours: z.number().min(1).max(720).optional(), // up to 30 days
  }),
});

export const joinWithCodeSchema = z.object({
  body: z.object({
    code: z.string().min(4).max(20),
  }),
});

export const validateInviteQuerySchema = z.object({
  params: z.object({
    code: z.string().min(4).max(20),
  }),
});
