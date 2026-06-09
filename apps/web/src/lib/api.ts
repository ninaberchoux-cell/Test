import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/api/auth/signin';
    }
    return Promise.reject(err);
  }
);

export const vacationApi = {
  list: () => api.get('/vacation').then(r => r.data),
  get: (id: string) => api.get(`/vacation/${id}`).then(r => r.data),
  create: (data: any) => api.post('/vacation', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/vacation/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/vacation/${id}`).then(r => r.data),
  activate: (id: string) => api.post(`/vacation/${id}/activate`).then(r => r.data),
};

export const emailApi = {
  list: (params?: any) => api.get('/emails', { params }).then(r => r.data),
  get: (id: string) => api.get(`/emails/${id}`).then(r => r.data),
  delegate: (id: string, colleagueId: string) =>
    api.post(`/emails/${id}/delegate`, { colleagueId }).then(r => r.data),
  analyse: (id: string) => api.post(`/emails/${id}/analyse`).then(r => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/emails/${id}/status`, { status }).then(r => r.data),
};

export const delegationApi = {
  list: (params?: any) => api.get('/delegations', { params }).then(r => r.data),
  stats: () => api.get('/delegations/stats').then(r => r.data),
  accept: (id: string) => api.patch(`/delegations/${id}/accept`).then(r => r.data),
  complete: (id: string) => api.patch(`/delegations/${id}/complete`).then(r => r.data),
};

export const analyticsApi = {
  overview: () => api.get('/analytics/overview').then(r => r.data),
  responseTime: (days?: number) =>
    api.get('/analytics/response-time', { params: { days } }).then(r => r.data),
  emailVolume: (days?: number) =>
    api.get('/analytics/email-volume', { params: { days } }).then(r => r.data),
  categories: () => api.get('/analytics/categories').then(r => r.data),
  sla: () => api.get('/analytics/sla').then(r => r.data),
};

export const aiApi = {
  summarize: (emailId: string) => api.post(`/ai/summarize/${emailId}`).then(r => r.data),
  draft: (emailId: string, tone?: string) =>
    api.post(`/ai/draft/${emailId}`, { tone }).then(r => r.data),
  vacationSummary: (vacationId: string) =>
    api.post(`/ai/vacation-summary/${vacationId}`).then(r => r.data),
  getSummary: (vacationId: string) =>
    api.get(`/ai/summary/${vacationId}`).then(r => r.data),
};

export const adminApi = {
  users: () => api.get('/admin/users').then(r => r.data),
  updateRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }).then(r => r.data),
  deactivateUser: (userId: string) =>
    api.patch(`/admin/users/${userId}/deactivate`).then(r => r.data),
  organizations: () => api.get('/admin/organizations').then(r => r.data),
  auditLogs: (params?: any) =>
    api.get('/admin/audit-logs', { params }).then(r => r.data),
};

export default api;
