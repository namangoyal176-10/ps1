export type MemberRole = 'LEADER' | 'MEMBER';
export type TeamStatus = 'OPEN' | 'FULL' | 'LOCKED';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  skills: string[];
  timezone: string;
  timezoneOffset: number;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  lookingForTeam: boolean;
  createdAt: string;
  teamMembership?: {
    id: string;
    teamId: string;
    role: MemberRole;
    team: Team;
  } | null;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string | null;
    bio?: string | null;
    skills: string[];
    timezone: string;
    timezoneOffset?: number;
    githubUrl?: string | null;
    portfolioUrl?: string | null;
  };
}

export interface TeamInvite {
  id: string;
  teamId: string;
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  teamId: string;
  userId: string;
  message?: string | null;
  status: RequestStatus;
  createdAt: string;
  team?: {
    id: string;
    name: string;
    description: string;
    track: string;
    status: TeamStatus;
    maxMembers: number;
    _count?: { members: number };
  };
  user?: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string | null;
    bio?: string | null;
    skills: string[];
    timezone: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description: string;
  track: string;
  skillsNeeded: string[];
  maxMembers: number;
  status: TeamStatus;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
  _count?: {
    members: number;
  };
  isLeader?: boolean;
  isMember?: boolean;
  activeInvites?: TeamInvite[];
  pendingRequests?: JoinRequest[];
}

export interface AuditLog {
  id: string;
  teamId?: string | null;
  actorId?: string | null;
  action: string;
  details?: any;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
}

export interface ScoredUserRecommendation {
  user: User;
  matchingSkills: string[];
  missingSkills: string[];
  skillScore: number;
  timezoneDifferenceHours: number;
  timezoneScore: number;
  matchScore: number;
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
  matchScore: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  error?: string;
}
