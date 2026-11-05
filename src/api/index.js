import { request } from './client';

// Thin wrappers over the documented endpoints. Nothing here changes the backend contract.
export const api = {
  auth: {
    requestOtp: (body) => request('/api/auth/otp/request', { method: 'POST', body, auth: false }),
    verifyOtp: (body) => request('/api/auth/otp/verify', { method: 'POST', body, auth: false }),
    logout: (refreshToken) => request('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
  },
  users: { me: () => request('/api/users/me') },
  analytics: {
    budgetPerformance: (month) => request('/api/analytics/budget-performance', { query: { month } }),
    annual: (year) => request('/api/analytics/annual-summary', { query: { year } }),
  },
  budgets: {
    get: (month) => request('/api/budgets', { query: { month } }),
    saveBatch: (month, allocations) => request('/api/budgets/batch', { method: 'POST', body: { month, allocations } }),
  },
  categories: {
    list: () => request('/api/categories'),
    create: (body) => request('/api/categories', { method: 'POST', body }),
  },
  incomes: {
    list: (month) => request('/api/incomes', { query: { month } }),
    create: (body) => request('/api/incomes', { method: 'POST', body }),
    remove: (id) => request(`/api/incomes/${id}`, { method: 'DELETE' }),
  },
  expenses: {
    list: (query) => request('/api/expenses', { query }),
    remove: (id) => request(`/api/expenses/${id}`, { method: 'DELETE' }),
  },
  sms: {
    validate: (body) => request('/api/sms/validate', { method: 'POST', body }),
    ingest: (body) => request('/api/sms/ingest', { method: 'POST', body }),
    pending: () => request('/api/sms/pending'),
    approve: (id, body = {}) => request(`/api/sms/${id}/approve`, { method: 'POST', body }),
    reject: (id) => request(`/api/sms/${id}/reject`, { method: 'POST' }),
  },
};
