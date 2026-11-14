import { prisma } from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';

export interface RegisterDTO {
  email: string;
  username: string;
  password: string;
  fullName: string;
  skills?: string[];
  timezone?: string;
  timezoneOffset?: number;
  bio?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

export interface LoginDTO {
  login: string; // email or username
  password: string;
}

export interface UpdateProfileDTO {
  fullName?: string;
  bio?: string;
  skills?: string[];
  timezone?: string;
  timezoneOffset?: number;
  githubUrl?: string;
  portfolioUrl?: string;
  lookingForTeam?: boolean;
}

export async function registerUser(dto: RegisterDTO) {
  const existingEmail = await prisma.user.findUnique({
    where: { email: dto.email.toLowerCase().trim() },
  });
  if (existingEmail) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username: dto.username.toLowerCase().trim() },
  });
  if (existingUsername) {
    throw new AppError(409, 'Username is already taken');
  }

  const passwordHash = await hashPassword(dto.password);

  const user = await prisma.user.create({
    data: {
      email: dto.email.toLowerCase().trim(),
      username: dto.username.toLowerCase().trim(),
      fullName: dto.fullName.trim(),
      passwordHash,
      skills: dto.skills || [],
      timezone: dto.timezone || 'UTC+0',
      timezoneOffset: dto.timezoneOffset ?? 0.0,
      bio: dto.bio || null,
      githubUrl: dto.githubUrl || null,
      portfolioUrl: dto.portfolioUrl || null,
      lookingForTeam: true,
    },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      bio: true,
      skills: true,
      timezone: true,
      timezoneOffset: true,
      githubUrl: true,
      portfolioUrl: true,
      lookingForTeam: true,
      createdAt: true,
    },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  return { user, token };
}

export async function loginUser(dto: LoginDTO) {
  const loginInput = dto.login.toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: loginInput }, { username: loginInput }],
    },
  });

  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  const isPasswordValid = await comparePassword(dto.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid credentials');
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  const { passwordHash: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      bio: true,
      skills: true,
      timezone: true,
      timezoneOffset: true,
      githubUrl: true,
      portfolioUrl: true,
      lookingForTeam: true,
      createdAt: true,
      teamMembership: {
        include: {
          team: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      username: true,
                      avatarUrl: true,
                      skills: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
}

export async function updateUserProfile(userId: string, dto: UpdateProfileDTO) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dto.fullName && { fullName: dto.fullName.trim() }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.skills && { skills: dto.skills }),
      ...(dto.timezone && { timezone: dto.timezone }),
      ...(dto.timezoneOffset !== undefined && { timezoneOffset: dto.timezoneOffset }),
      ...(dto.githubUrl !== undefined && { githubUrl: dto.githubUrl }),
      ...(dto.portfolioUrl !== undefined && { portfolioUrl: dto.portfolioUrl }),
      ...(dto.lookingForTeam !== undefined && { lookingForTeam: dto.lookingForTeam }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      bio: true,
      skills: true,
      timezone: true,
      timezoneOffset: true,
      githubUrl: true,
      portfolioUrl: true,
      lookingForTeam: true,
      updatedAt: true,
    },
  });

  return user;
}
