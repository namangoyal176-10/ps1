import { z } from 'zod';

export const createJoinRequestSchema = z.object({
  body: z.object({
    teamId: z.string().uuid('Invalid team ID'),
    message: z.string().max(500).optional(),
  }),
});

export const handleJoinRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid request ID'),
  }),
});
