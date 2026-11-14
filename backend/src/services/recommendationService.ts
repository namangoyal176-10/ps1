import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { TeamStatus } from '@prisma/client';

export interface ScoredUserRecommendation {
  user: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    skills: string[];
    timezone: string;
    timezoneOffset: number;
    githubUrl: string | null;
    portfolioUrl: string | null;
  };
  matchingSkills: string[];
  missingSkills: string[];
  skillScore: number;
  timezoneDifferenceHours: number;
  timezoneScore: number;
  matchScore: number; // 0 - 100%
}

export interface ScoredTeamRecommendation {
  team: {
    id: string;
    name: string;
    description: string;
    track: string;
    skillsNeeded: string[];
    maxMembers: number;
    currentMembers: number;
  };
  matchingSkills: string[];
  skillScore: number;
  timezoneDifferenceHours: number;
  timezoneScore: number;
  matchScore: number; // 0 - 100%
}

/**
 * Recommend solo participants for a team looking for members
 */
export async function getTeammateRecommendationsForTeam(
  teamId: string,
  limit = 10
): Promise<ScoredUserRecommendation[]> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: {
            select: {
              timezoneOffset: true,
              skills: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  // Calculate team's average timezone offset
  const teamOffsets = team.members.map((m) => m.user.timezoneOffset);
  const avgTeamOffset =
    teamOffsets.length > 0 ? teamOffsets.reduce((a, b) => a + b, 0) / teamOffsets.length : 0.0;

  const targetSkills = new Set(team.skillsNeeded.map((s) => s.toLowerCase()));

  // Fetch candidates who are looking for a team and have no active team membership
  const candidates = await prisma.user.findMany({
    where: {
      lookingForTeam: true,
      teamMembership: null,
    },
    take: 200, // Evaluate top candidates
    select: {
      id: true,
      fullName: true,
      username: true,
      avatarUrl: true,
      bio: true,
      skills: true,
      timezone: true,
      timezoneOffset: true,
      githubUrl: true,
      portfolioUrl: true,
    },
  });

  const scored: ScoredUserRecommendation[] = candidates.map((candidate) => {
    const candidateSkillsLower = candidate.skills.map((s) => s.toLowerCase());

    // Matching skills
    const matchingSkills = candidate.skills.filter((s) => targetSkills.has(s.toLowerCase()));
    const missingSkills = team.skillsNeeded.filter(
      (s) => !candidateSkillsLower.includes(s.toLowerCase())
    );

    // Skill score calculation
    let skillScore = 0;
    if (team.skillsNeeded.length > 0) {
      skillScore = matchingSkills.length / team.skillsNeeded.length;
    } else {
      skillScore = 0.5; // neutral if team listed no specific skills
    }

    // Timezone difference
    const tzDiff = Math.abs(avgTeamOffset - candidate.timezoneOffset);
    // Score decays linearly up to 12h difference
    const timezoneScore = Math.max(0, 1 - tzDiff / 12);

    // Composite match percentage (70% skills, 30% timezone)
    const composite = skillScore * 0.7 + timezoneScore * 0.3;
    const matchScore = Math.round(composite * 100);

    return {
      user: candidate,
      matchingSkills,
      missingSkills,
      skillScore: Math.round(skillScore * 100) / 100,
      timezoneDifferenceHours: Math.round(tzDiff * 10) / 10,
      timezoneScore: Math.round(timezoneScore * 100) / 100,
      matchScore,
    };
  });

  // Sort descending by matchScore
  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, limit);
}

/**
 * Recommend open teams for an individual participant
 */
export async function getTeamRecommendationsForUser(
  userId: string,
  limit = 10
): Promise<ScoredTeamRecommendation[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      skills: true,
      timezoneOffset: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const userSkills = new Set(user.skills.map((s) => s.toLowerCase()));

  // Fetch open teams with available seats
  const teams = await prisma.team.findMany({
    where: {
      status: TeamStatus.OPEN,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              timezoneOffset: true,
            },
          },
        },
      },
    },
    take: 100,
  });

  // Filter teams that actually have open spots
  const openTeams = teams.filter((t) => t.members.length < t.maxMembers);

  const scored: ScoredTeamRecommendation[] = openTeams.map((team) => {
    // Matching skills
    const matchingSkills = team.skillsNeeded.filter((s) => userSkills.has(s.toLowerCase()));

    let skillScore = 0;
    if (team.skillsNeeded.length > 0) {
      skillScore = matchingSkills.length / team.skillsNeeded.length;
    } else {
      skillScore = 0.5;
    }

    const teamOffsets = team.members.map((m) => m.user.timezoneOffset);
    const avgOffset =
      teamOffsets.length > 0 ? teamOffsets.reduce((a, b) => a + b, 0) / teamOffsets.length : 0.0;

    const tzDiff = Math.abs(user.timezoneOffset - avgOffset);
    const timezoneScore = Math.max(0, 1 - tzDiff / 12);

    const composite = skillScore * 0.7 + timezoneScore * 0.3;
    const matchScore = Math.round(composite * 100);

    return {
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        track: team.track,
        skillsNeeded: team.skillsNeeded,
        maxMembers: team.maxMembers,
        currentMembers: team.members.length,
      },
      matchingSkills,
      skillScore: Math.round(skillScore * 100) / 100,
      timezoneDifferenceHours: Math.round(tzDiff * 10) / 10,
      timezoneScore: Math.round(timezoneScore * 100) / 100,
      matchScore,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, limit);
}
