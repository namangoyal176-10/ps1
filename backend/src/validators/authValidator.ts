import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(60),
    skills: z.array(z.string()).optional(),
    timezone: z.string().optional(),
    timezoneOffset: z.number().min(-12).max(14).optional(),
    bio: z.string().max(500).optional(),
    githubUrl: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
    portfolioUrl: z.string().url('Invalid portfolio URL').optional().or(z.literal('')),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    login: z.string().min(1, 'Email or username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(60).optional(),
    bio: z.string().max(500).optional(),
    skills: z.array(z.string()).optional(),
    timezone: z.string().optional(),
    timezoneOffset: z.number().min(-12).max(14).optional(),
    githubUrl: z.string().url().optional().or(z.literal('')),
    portfolioUrl: z.string().url().optional().or(z.literal('')),
    lookingForTeam: z.boolean().optional(),
  }),
});
