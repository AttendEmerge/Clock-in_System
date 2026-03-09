import axios from 'axios';

const api = axios.create({
  baseURL:         '/api',
  headers:         { 'Content-Type': 'application/json' },
  withCredentials: true,   // always send/receive cookies (refresh token)
});

// ── Token store (in-memory only; never localStorage) ─────────────────────────
let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
}

export function getAuthToken(): string | null {
  return _token;
}

// ── Auth-failure callback (set by AuthContext so we avoid hard reloads) ───────
let _onAuthFailed: (() => void) | null = null;

export function setOnAuthFailed(fn: (() => void) | null) {
  _onAuthFailed = fn;
}

// Attach the in-memory access token to every request
api.interceptors.request.use(config => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

// On 401: silently refresh once, then retry; on second failure → login
let _refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Deduplicate concurrent refresh attempts
        if (!_refreshing) {
          _refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
            .then(async r => {
              if (!r.ok) throw new Error('refresh_failed');
              const data = await r.json();
              return data.token as string;
            })
            .finally(() => { _refreshing = null; });
        }
        const newToken = await _refreshing;
        setAuthToken(newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      } catch {
        setAuthToken(null);
        if (_onAuthFailed) _onAuthFailed();
      }
    }
    return Promise.reject(err);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string, remember_me = false) =>
  api.post('/auth/login', { email, password, remember_me }).then(r => r.data);

export const refreshSession = () =>
  api.post('/auth/refresh').then(r => r.data);

export const logoutSession = () =>
  api.post('/auth/logout').then(r => r.data);

export const getMe = () => api.get('/auth/me').then(r => r.data);

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.put('/auth/change-password', { currentPassword, newPassword }).then(r => r.data);

// ── CLOCK ─────────────────────────────────────────────────────────────────────
export const getQRSession = () => api.get('/clock/qr-session').then(r => r.data);

export const clockInQR = (qr_token: string, latitude?: number, longitude?: number, accuracy?: number) =>
  api.post('/clock/qr', { qr_token, latitude, longitude, accuracy }).then(r => r.data);

export const clockInToken = (token: string, latitude?: number, longitude?: number, accuracy?: number) =>
  api.post('/clock/token', { token, latitude, longitude, accuracy }).then(r => r.data);

export const clockOut = () => api.post('/clock/out').then(r => r.data);

export const getClockStatus = () => api.get('/clock/status').then(r => r.data);

export const getMyClockHistory = (params?: object) =>
  api.get('/clock/history', { params }).then(r => r.data);

// ── EMPLOYEE ──────────────────────────────────────────────────────────────────
export const getEmployeeDashboard = () => api.get('/employee/dashboard').then(r => r.data);

export const requestOvertime = (reason: string, requested_date: string) =>
  api.post('/employee/overtime-request', { reason, requested_date }).then(r => r.data);

export const getMyOvertimeRequests = () => api.get('/employee/overtime-requests').then(r => r.data);

export const requestTokenFromHR = (data: { location_id: number; reason: string }) =>
  api.post('/employee/token-request', data).then(r => r.data);

export const getMyTokenRequests = () => api.get('/employee/token-requests').then(r => r.data);

export const requestLeave = (data: object) =>
  api.post('/employee/leave-request', data).then(r => r.data);

export const getMyLeaveRequests = () =>
  api.get('/employee/leave-requests').then(r => r.data);

export const logMyEarlyReturn = (id: number, actual_return_date: string, reason: string) =>
  api.patch(`/employee/leave-requests/${id}/early-return`, { actual_return_date, reason }).then(r => r.data);

export const requestLeaveExtension = (id: number, extra_days: number, reason: string) =>
  api.post(`/employee/leave-requests/${id}/extend`, { extra_days, reason }).then(r => r.data);

// ── SUPERVISOR ────────────────────────────────────────────────────────────────
export const getSupervisorDashboard = () => api.get('/supervisor/dashboard').then(r => r.data);

export const getTeam = () => api.get('/supervisor/team').then(r => r.data);

export const getSupervisorOvertimeRequests = (status?: string) =>
  api.get('/supervisor/overtime-requests', { params: { status } }).then(r => r.data);

export const actionOvertimeRequest = (id: number, action: 'approve' | 'reject', rejection_reason?: string) =>
  api.patch(`/supervisor/overtime-requests/${id}`, { action, rejection_reason }).then(r => r.data);

// ── HR ────────────────────────────────────────────────────────────────────────
export const getHRDashboard = () => api.get('/hr/dashboard').then(r => r.data);

export const getUsers = (params?: object) => api.get('/hr/users', { params }).then(r => r.data);
export const createUser = (data: object)  => api.post('/hr/users', data).then(r => r.data);
export const updateUser = (id: number, data: object) => api.put(`/hr/users/${id}`, data).then(r => r.data);
export const deleteUser = (id: number) => api.delete(`/hr/users/${id}`).then(r => r.data);
export const resetUserPassword = (id: number, new_password: string) =>
  api.put(`/hr/users/${id}/reset-password`, { new_password }).then(r => r.data);
export const updateLeaveBalance = (id: number, data: object) =>
  api.put(`/hr/users/${id}/leave`, data).then(r => r.data);

export const getDepartments = () => api.get('/hr/departments').then(r => r.data);
export const createDepartment = (data: object) => api.post('/hr/departments', data).then(r => r.data);
export const updateDepartment = (id: number, data: object) => api.put(`/hr/departments/${id}`, data).then(r => r.data);
export const deleteDepartment = (id: number) => api.delete(`/hr/departments/${id}`).then(r => r.data);

export const generateToken = (data: object) => api.post('/hr/tokens', data).then(r => r.data);
export const getTokens = (params?: object)  => api.get('/hr/tokens', { params }).then(r => r.data);

export const getFlaggedEvents = (params?: object) => api.get('/hr/flags', { params }).then(r => r.data);
export const unflagEvent = (id: number, data: object) => api.patch(`/hr/flags/${id}/unflag`, data).then(r => r.data);

export const getHRTokenRequests = (params?: object) =>
  api.get('/hr/token-requests', { params }).then(r => r.data);
export const actionTokenRequest = (id: number, data: { action: 'approve' | 'reject'; hr_note?: string }) =>
  api.patch(`/hr/token-requests/${id}`, data).then(r => r.data);

export const getAcceptableLocations = () => api.get('/hr/locations').then(r => r.data);
export const getEmployeeLocations  = () => api.get('/employee/locations').then(r => r.data);
export const addAcceptableLocation  = (data: object) => api.post('/hr/locations', data).then(r => r.data);
export const updateAcceptableLocation = (id: number, data: object) => api.put(`/hr/locations/${id}`, data).then(r => r.data);
export const deleteAcceptableLocation = (id: number) => api.delete(`/hr/locations/${id}`).then(r => r.data);

export const getWorkSchedule   = () => api.get('/hr/schedule').then(r => r.data);
export const updateWorkSchedule = (data: object) => api.put('/hr/schedule', data).then(r => r.data);

export const getHROvertimeRequests = (status?: string) =>
  api.get('/hr/overtime-requests', { params: { status } }).then(r => r.data);

export const getEmployeeClockHistory = (params?: object) =>
  api.get('/hr/clock-history', { params }).then(r => r.data);

// HR Leave management
export const getHRLeaveRequests = (params?: object) =>
  api.get('/hr/leave-requests', { params }).then(r => r.data);

export const reviewLeaveRequest = (id: number, action: 'approve' | 'deny', hr_note?: string) =>
  api.patch(`/hr/leave-requests/${id}/review`, { action, hr_note }).then(r => r.data);

export const hrLogEarlyReturn = (id: number, actual_return_date: string, reason: string) =>
  api.patch(`/hr/leave-requests/${id}/early-return`, { actual_return_date, reason }).then(r => r.data);

export const getLeaveExtensions = (leaveRequestId: number) =>
  api.get(`/hr/leave-requests/${leaveRequestId}/extensions`).then(r => r.data);

export const reviewExtensionRequest = (id: number, action: 'approve' | 'deny', hr_note?: string) =>
  api.patch(`/hr/leave-extensions/${id}/review`, { action, hr_note }).then(r => r.data);

export const getLeaveReportUrl = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return `/api/hr/leave-report${qs ? '?' + qs : ''}`;
};

// Leave policy
export const getLeavePolicy = () => api.get('/hr/leave-policy').then(r => r.data);
export const createLeavePolicyType = (data: { leave_type: string; default_days: number; gender_applicable?: string }) =>
  api.post('/hr/leave-policy', data).then(r => r.data);
export const updateLeavePolicy = (leave_type: string, data: { default_days: number; gender_applicable?: string }) =>
  api.put(`/hr/leave-policy/${leave_type}`, data).then(r => r.data);
export const deleteLeavePolicyType = (leave_type: string) =>
  api.delete(`/hr/leave-policy/${leave_type}`).then(r => r.data);

// Holidays (HR)
export const getHolidays = (params?: object) => api.get('/hr/holidays', { params }).then(r => r.data);
export const createHoliday = (data: { date: string; name: string; description?: string }) =>
  api.post('/hr/holidays', data).then(r => r.data);
export const updateHoliday = (id: number, data: object) => api.put(`/hr/holidays/${id}`, data).then(r => r.data);
export const deleteHoliday = (id: number) => api.delete(`/hr/holidays/${id}`).then(r => r.data);

// Holidays (Employee - read-only)
export const getEmployeeHolidays = () => api.get('/employee/holidays').then(r => r.data);

// Attendance & overtime reports
export const getAttendanceReportPreview = (params?: object) =>
  api.get('/hr/report/attendance', { params }).then(r => r.data);
export const getOvertimeReportPreview = (params?: object) =>
  api.get('/hr/report/overtime', { params }).then(r => r.data);

export const getAttendanceReportUrl = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return `/api/hr/report/attendance/export${qs ? '?' + qs : ''}`;
};
export const getOvertimeReportUrl = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return `/api/hr/report/overtime/export${qs ? '?' + qs : ''}`;
};

export default api;
