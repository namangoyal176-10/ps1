import { ApiResponse, User, Team, TeamInvite, JoinRequest, AuditLog, ScoredUserRecommendation, ScoredTeamRecommendation } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('raceproof_token');
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Auto attach Idempotency-Key on mutating actions
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    if (!headers.has('Idempotency-Key')) {
      const generatedKey = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      headers.set('Idempotency-Key', generatedKey);
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({
    success: false,
    error: 'Failed to parse server response',
  }));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const authApi = {
  register: (payload: any) => request<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request<User>('/auth/me'),
  updateProfile: (payload: any) => request<User>('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
};

export const teamsApi = {
  getTeams: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request<Team[]>(`/teams?${query.toString()}`);
  },
  getTeamById: (id: string) => request<Team>(`/teams/${id}`),
  createTeam: (payload: any) => request<Team>('/teams', { method: 'POST', body: JSON.stringify(payload) }),
  updateTeam: (id: string, payload: any) => request<Team>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  leaveTeam: (id: string) => request<any>(`/teams/${id}/leave`, { method: 'POST' }),
  transferLeadership: (teamId: string, targetUserId: string) =>
    request<any>(`/teams/${teamId}/transfer-leadership`, { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  kickMember: (teamId: string, userId: string) =>
    request<any>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
  joinWithCode: (code: string) =>
    request<any>('/teams/join-with-code', { method: 'POST', body: JSON.stringify({ code }) }),
};

export const invitesApi = {
  createInvite: (payload: { teamId: string; maxUses?: number; expiresInHours?: number }) =>
    request<TeamInvite>('/invites', { method: 'POST', body: JSON.stringify(payload) }),
  revokeInvite: (id: string) => request<TeamInvite>(`/invites/${id}`, { method: 'DELETE' }),
  validateInvite: (code: string) => request<any>(`/invites/validate/${code}`),
  getTeamInvites: (teamId: string) => request<TeamInvite[]>(`/invites/team/${teamId}`),
};

export const joinRequestsApi = {
  createJoinRequest: (teamId: string, message?: string) =>
    request<JoinRequest>('/join-requests', { method: 'POST', body: JSON.stringify({ teamId, message }) }),
  acceptJoinRequest: (requestId: string) =>
    request<any>(`/join-requests/${requestId}/accept`, { method: 'POST' }),
  declineJoinRequest: (requestId: string) =>
    request<any>(`/join-requests/${requestId}/decline`, { method: 'POST' }),
  cancelJoinRequest: (requestId: string) =>
    request<any>(`/join-requests/${requestId}`, { method: 'DELETE' }),
  getMyRequests: () => request<JoinRequest[]>('/join-requests/my-requests'),
};

export const recommendationsApi = {
  getTeammatesForTeam: (teamId: string, limit = 10) =>
    request<ScoredUserRecommendation[]>(`/recommendations/team/${teamId}?limit=${limit}`),
  getTeamsForUser: (limit = 10) =>
    request<ScoredTeamRecommendation[]>(`/recommendations/user/teams?limit=${limit}`),
};

export const auditApi = {
  getGlobalAuditLogs: (limit = 50) => request<AuditLog[]>(`/audit/global?limit=${limit}`),
  getTeamAuditLogs: (teamId: string, limit = 50) => request<AuditLog[]>(`/audit/team/${teamId}?limit=${limit}`),
};
