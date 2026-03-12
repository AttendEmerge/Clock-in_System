export interface User {
  id: number;
  name: string;
  email: string;
  role: 'employee' | 'supervisor' | 'hr';
  gender?: 'male' | 'female' | 'other';
  department_id: number | null;
  department_name?: string;
}

export interface ClockEvent {
  id: number;
  user_id: number;
  user_name?: string;
  email?: string;
  department_name?: string;
  event_type: 'clock_in' | 'clock_out';
  event_timestamp: string;
  latitude: number | null;
  longitude: number | null;
  method: 'qr' | 'token' | 'auto_checkout';
  is_overtime: number;
  is_flagged: number;
  flag_reason: string | null;
  is_unflagged: number;
  early_departure_reason?: string | null;
}

export interface LeaveBalance {
  id: number;
  user_id: number;
  leave_type: 'paid' | 'sick' | 'maternity' | 'paternity';
  days_remaining: number;
  days_allocated: number;
  days_used: number;
  year: number;
}

export interface LeaveExtensionRequest {
  id: number;
  leave_request_id: number;
  user_id: number;
  requester_name?: string;
  extra_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  hr_id: number | null;
  hr_name?: string;
  hr_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  employee_name?: string;
  employee_email?: string;
  gender?: string;
  department_name?: string;
  leave_type: 'paid' | 'sick' | 'maternity' | 'paternity';
  description: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: 'pending' | 'approved' | 'denied' | 'active' | 'completed' | 'early_return';
  hr_id: number | null;
  hr_name?: string;
  hr_note: string | null;
  actual_return_date: string | null;
  early_return_reason: string | null;
  early_return_logged_by: number | null;
  logged_by_name?: string;
  created_at: string;
  updated_at: string;
  extensions?: LeaveExtensionRequest[];
}

export interface OvertimeRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  supervisor_id: number | null;
  supervisor_name?: string;
  reason: string;
  requested_date: string;
  status: 'pending' | 'supervisor_approved' | 'hr_approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  member_count?: number;
}

export interface AcceptableLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: number;
  added_by_name?: string;
  created_at: string;
}

export interface WorkSchedule {
  id: number;
  expected_start: string;
  expected_end: string;
  late_grace_minutes: number;
  overtime_buffer_minutes: number;
}

export interface OneTimeToken {
  id: number;
  for_user_name?: string;
  generated_by_name?: string;
  plain_token: string;
  token_type: 'regular' | 'overtime';
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface ClockStatus {
  is_clocked_in: boolean;
  last_event: ClockEvent | null;
  today_events: ClockEvent[];
  total_minutes_today: number;
}

export interface EmployeeDashboard {
  leave_balances: LeaveBalance[];
  attendance: {
    days_present: number;
    days_absent: number;
    working_days_this_month: number;
    working_days_remaining: number;
    attendance_rate: number;
  };
  recent_events: ClockEvent[];
  overtime_requests: OvertimeRequest[];
  pending_tokens: OneTimeToken[];
  active_leave_requests: Pick<LeaveRequest, 'id' | 'leave_type' | 'status' | 'start_date' | 'end_date'>[];
}

export interface HRDashboard {
  total_employees: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  flagged_count: number;
  pending_overtime: number;
  pending_leave: number;
  pending_token_requests: number;
  department_stats: { department: string; total: number; present: number }[];
  weekly_attendance: { day: string; count: number }[];
}
