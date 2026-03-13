import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import {
  Clock, QrCode, KeyRound, LogOut, Briefcase, Heart, Baby, Users,
  TrendingUp, CheckCircle2, AlertCircle, RefreshCw, Timer, CalendarHeart,
} from 'lucide-react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import {
  getEmployeeDashboard, getClockStatus, getClockOutCheck, clockOut,
  requestOvertime, getQRSession, requestTokenFromHR,
  getEmployeeLocations, getEmployeeHolidays,
} from '../../services/api';
import type { AcceptableLocation, EmployeeDashboard as DashboardType, ClockStatus } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';

const leaveIcons: Record<string, ReactNode> = {
  paid: <Briefcase size={18} />,
  sick: <Heart size={18} />,
  maternity: <Baby size={18} />,
  paternity: <Users size={18} />,
};
const defaultLeaveIcon = <CalendarHeart size={18} />;

export default function EmployeeDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardType | null>(null);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // QR modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [_qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Token request / OT modals
  const [showTokenRequestModal, setShowTokenRequestModal] = useState(false);
  const [showOTModal, setShowOTModal] = useState(false);
  const [tokenReqLocationId, setTokenReqLocationId] = useState('');
  const [tokenReqReason, setTokenReqReason] = useState('');
  const [acceptableLocations, setAcceptableLocations] = useState<AcceptableLocation[]>([]);
  const [otReason, setOtReason] = useState('');
  const [otDate, setOtDate] = useState('');

  // Holiday
  const [todayHoliday, setTodayHoliday] = useState<string | null>(null);

  // Feedback
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  // Clock-out modals (early = reason required, confirm = simple confirmation)
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');
  const [clockOutChecking, setClockOutChecking] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [dash, status, holidays] = await Promise.all([
        getEmployeeDashboard(),
        getClockStatus(),
        getEmployeeHolidays(),
      ]);
      setDashboard(dash);
      setClockStatus(status);
      const todayStr = new Date().toISOString().slice(0, 10);
      const match = holidays.find((h: { date: string; name: string }) => {
        const d = typeof h.date === 'string' ? h.date.slice(0, 10) : h.date;
        return d === todayStr;
      });
      setTodayHoliday(match ? match.name : null);
    } catch {}
    setLoading(false);
  }

  // ── QR Modal ──────────────────────────────────────────────────────────────

  const loadQR = useCallback(async () => {
    setQrLoading(true);
    try {
      const data = await getQRSession();
      setQrImage(data.qr_image);
      const exp = new Date(data.expires_at);
      setQrExpiresAt(exp);
      setQrSecondsLeft(Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000)));
    } catch {}
    setQrLoading(false);
  }, []);

  function openQRModal() {
    setShowQRModal(true);
    setActionMsg('');
    setActionError('');
    loadQR();

    // Countdown timer — ticks every second
    if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
    qrCountdownRef.current = setInterval(() => {
      setQrSecondsLeft(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    // Auto-refresh QR image every 5 min (matches backend rotation)
    if (qrPollRef.current) clearInterval(qrPollRef.current);
    qrPollRef.current = setInterval(loadQR, 5 * 60 * 1000);
  }

  function closeQRModal() {
    setShowQRModal(false);
    if (qrPollRef.current) clearInterval(qrPollRef.current);
    if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
  }

  // When QR modal is open, poll clock status every 5 s so the dashboard
  // auto-updates the moment the employee clocks in from their phone.
  useEffect(() => {
    if (!showQRModal) return;
    const poll = setInterval(async () => {
      try {
        const status = await getClockStatus();
        setClockStatus(status);
        if (status.is_clocked_in) {
          // They scanned and clocked in — close modal and celebrate
          closeQRModal();
          setActionMsg('Clocked in successfully via QR!');
          fetchAll();
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [showQRModal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
      if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
    };
  }, []);

  // ── Token request ────────────────────────────────────────────────────────

  async function openTokenRequestModal() {
    setShowTokenRequestModal(true);
    setActionMsg('');
    setActionError('');
    setTokenReqLocationId('');
    setTokenReqReason('');
    try {
      const locs = await getEmployeeLocations();
      setAcceptableLocations(locs);
    } catch {}
  }

  async function handleTokenRequest(e: React.FormEvent) {
    e.preventDefault();
    setActionError('');
    try {
      await requestTokenFromHR({ location_id: parseInt(tokenReqLocationId), reason: tokenReqReason });
      setActionMsg('Token request submitted. HR will review and clock you in once approved.');
      setShowTokenRequestModal(false);
      fetchAll();
    } catch (e: any) {
      setActionError(e.response?.data?.error || 'Failed to submit token request.');
    }
  }

  // ── Clock out ─────────────────────────────────────────────────────────────

  async function handleClockOut() {
    setActionError('');
    setActionMsg('');
    setEarlyReason('');
    setClockOutChecking(true);
    try {
      const { requires_reason } = await getClockOutCheck();
      if (requires_reason) {
        setShowEarlyModal(true);
      } else {
        setShowConfirmModal(true);
      }
    } catch {
      setActionError('Unable to check clock-out status. Please try again.');
    } finally {
      setClockOutChecking(false);
    }
  }

  async function confirmEarlyDeparture() {
    try {
      const reason = earlyReason.trim();
      const res = await clockOut(reason);
      setActionMsg(res.is_early_departure
        ? 'Clocked out early. Your reason has been recorded.'
        : 'Clocked out successfully.');
      setShowEarlyModal(false);
      setEarlyReason('');
      fetchAll();
    } catch (e: any) {
      setActionError(e.response?.data?.error || 'Clock-out failed.');
    }
  }

  async function confirmClockOut() {
    try {
      await clockOut();
      setActionMsg('Clocked out successfully.');
      setShowConfirmModal(false);
      fetchAll();
    } catch (e: any) {
      setActionError(e.response?.data?.error || 'Clock-out failed.');
    }
  }

  // ── Overtime request ──────────────────────────────────────────────────────

  async function handleOTRequest(e: React.FormEvent) {
    e.preventDefault();
    try {
      await requestOvertime(otReason, otDate);
      setActionMsg('Overtime request submitted successfully.');
      setShowOTModal(false);
      setOtReason('');
      setOtDate('');
      fetchAll();
    } catch (e: any) {
      setActionError(e.response?.data?.error || 'Failed to submit request.');
    }
  }

  function formatMinutes(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  const isClockedIn = clockStatus?.is_clocked_in;

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>

        {/* Holiday banner */}
        {todayHoliday && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CalendarHeart size={18} />
            <span>
              <strong>Today is a holiday: {todayHoliday}.</strong> Regular clock-in is disabled. Use the <strong>Request Overtime</strong> flow if you need to work today.
            </span>
          </div>
        )}

        {/* End-of-day: regular clock-in disabled until tomorrow */}
        {!todayHoliday && clockStatus?.regular_clock_in_blocked && !isClockedIn && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <Clock size={18} />
            <span>
              Regular clock-in is disabled until tomorrow at 6am.{' '}
              <a href="/employee/overtime" className="font-semibold underline hover:text-amber-900">
                Request Overtime
              </a>
              {' '}to use overtime clock-in if you still need to work.
            </span>
          </div>
        )}

        {/* Feedback banners */}
        {actionMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> {actionMsg}
            <button onClick={() => setActionMsg('')} className="ml-auto text-green-500 hover:text-green-700">✕</button>
          </div>
        )}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {actionError}
            <button onClick={() => setActionError('')} className="ml-auto text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Clock-in panel */}
        <div className={`rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4
          ${isClockedIn ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${isClockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className={`font-semibold ${isClockedIn ? 'text-green-700' : 'text-gray-600'}`}>
                {isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
              </span>
            </div>
            {isClockedIn && clockStatus?.last_event && (
              <p className="text-sm text-green-600">
                Since {format(new Date(clockStatus.last_event.event_timestamp), 'HH:mm')}
                {' · '}{formatMinutes(clockStatus.total_minutes_today)} today
              </p>
            )}
            {!isClockedIn && clockStatus?.last_event && clockStatus.last_event.event_type === 'clock_out' && (
              <p className="text-sm text-gray-500">
                Last clocked out {formatDistanceToNow(new Date(clockStatus.last_event.event_timestamp), { addSuffix: true })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!isClockedIn && !todayHoliday && !clockStatus?.regular_clock_in_blocked && (
              <>
                <button
                  onClick={openQRModal}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <QrCode size={16} /> Show QR Code
                </button>
                <button
                  onClick={openTokenRequestModal}
                  className="flex items-center gap-2 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <KeyRound size={16} /> Request Token
                </button>
              </>
            )}
            {isClockedIn && (
              <button
                onClick={handleClockOut}
                disabled={clockOutChecking}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut size={16} /> {clockOutChecking ? 'Checking...' : 'Clock Out'}
              </button>
            )}
            <button
              onClick={() => setShowOTModal(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Request Overtime
            </button>
          </div>
        </div>

        {/* Pending tokens */}
        {dashboard?.pending_tokens && dashboard.pending_tokens.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-yellow-800 mb-2">You have pending tokens:</p>
            <div className="flex flex-wrap gap-2">
              {dashboard.pending_tokens.map(t => (
                <div key={t.id} className="bg-white border border-yellow-200 rounded-lg px-3 py-2 text-sm">
                  <span className="font-mono font-bold text-gray-900">{t.plain_token}</span>
                  <span className="text-gray-500 ml-2">({t.token_type})</span>
                  <span className="text-yellow-600 ml-2 text-xs">expires {format(new Date(t.expires_at), 'HH:mm')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Days Present"
            value={dashboard?.attendance.days_present || 0}
            sub={`of ${dashboard?.attendance.working_days_this_month || 0} working days so far`}
            icon={<TrendingUp size={20} />}
            color="blue"
          />
          <StatCard
            label="Days Absent"
            value={dashboard?.attendance.days_absent || 0}
            sub="This month"
            icon={<AlertCircle size={20} />}
            color="red"
          />
          <StatCard
            label="Attendance Rate"
            value={`${dashboard?.attendance.attendance_rate || 0}%`}
            sub="This month"
            icon={<CheckCircle2 size={20} />}
            color="green"
          />
          <StatCard
            label="Days Left in Month"
            value={dashboard?.attendance.working_days_remaining ?? 0}
            sub="Working days remaining"
            icon={<Clock size={20} />}
            color="purple"
          />
        </div>

        {/* Leave Balances */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Leave Balances</h2>
            <a href="/employee/leave" className="text-sm text-blue-600 hover:underline">Manage leave →</a>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboard?.leave_balances.map(lb => {
              const pct = (lb.days_allocated ?? 0) > 0
                ? Math.round(((lb.days_used ?? 0) / lb.days_allocated) * 100)
                : 0;
              return (
                <div key={lb.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                    lb.leave_type === 'paid'      ? 'bg-blue-50 text-blue-600' :
                    lb.leave_type === 'sick'      ? 'bg-red-50 text-red-600' :
                    lb.leave_type === 'maternity' ? 'bg-purple-50 text-purple-600' :
                    'bg-green-50 text-green-600'
                  }`}>
                    {leaveIcons[lb.leave_type] || defaultLeaveIcon}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{lb.days_remaining}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{lb.leave_type} Leave</p>
                  <p className="text-xs text-gray-400">of {lb.days_allocated ?? lb.days_remaining} days remaining</p>
                  {(lb.days_allocated ?? 0) > 0 && (
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-1">
                      <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <button onClick={fetchAll} className="text-gray-400 hover:text-gray-600">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {clockStatus?.today_events.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No activity today</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {clockStatus?.today_events.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${ev.event_type === 'clock_in' ? 'bg-green-500' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {ev.event_type === 'clock_in' ? 'Clocked In' : 'Clocked Out'}
                          {ev.is_overtime ? <span className="ml-1 text-xs text-orange-600">(Overtime)</span> : null}
                        </p>
                        <p className="text-xs text-gray-500">{ev.method} · {format(new Date(ev.event_timestamp), 'HH:mm:ss')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ev.is_flagged && !ev.is_unflagged && (
                        <Badge variant="warning">⚠ {ev.flag_reason}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Overtime requests */}
        {dashboard?.overtime_requests && dashboard.overtime_requests.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Overtime Requests</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {dashboard.overtime_requests.map(ot => (
                  <div key={ot.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ot.requested_date}</p>
                      <p className="text-xs text-gray-500">{ot.reason}</p>
                    </div>
                    <Badge variant={
                      ot.status === 'hr_approved' ? 'success' :
                      ot.status === 'supervisor_approved' ? 'info' :
                      ot.status === 'rejected' ? 'danger' : 'neutral'
                    }>
                      {ot.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── QR Code Modal ─────────────────────────────────────────────────── */}
      {showQRModal && (
        <Modal title="Scan to Clock In" onClose={closeQRModal} size="sm">
          <div className="space-y-4">

            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">How to clock in:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                <li>Open your phone's camera app</li>
                <li>Point it at the QR code below</li>
                <li>Tap the link that appears on your screen</li>
                <li>Allow location access when prompted</li>
                <li>Tap <strong>"Clock In Now"</strong></li>
              </ol>
            </div>

            {/* QR image */}
            <div className="flex flex-col items-center">
              {qrLoading ? (
                <div className="w-56 h-56 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
              ) : qrImage ? (
                <div className="p-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
                  <img src={qrImage} alt="Clock-in QR Code" className="w-52 h-52" />
                </div>
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-red-50 rounded-xl border border-red-200">
                  <p className="text-red-600 text-sm text-center px-4">Failed to load QR code</p>
                </div>
              )}
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <Timer size={15} className={qrSecondsLeft < 30 ? 'text-red-500' : 'text-gray-400'} />
              <span className={`font-mono ${qrSecondsLeft < 30 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                Refreshes in {Math.floor(qrSecondsLeft / 60)}:{String(qrSecondsLeft % 60).padStart(2, '0')}
              </span>
              <button onClick={loadQR} className="text-blue-500 hover:text-blue-700 ml-1">
                <RefreshCw size={13} />
              </button>
            </div>

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg py-2 text-sm text-gray-500">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Waiting for your phone to scan…
            </div>

            <button onClick={closeQRModal}
              className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Token Request Modal ──────────────────────────────────────────── */}
      {showTokenRequestModal && (
        <Modal title="Request Clock-in Token" onClose={() => setShowTokenRequestModal(false)} size="sm">
          <form onSubmit={handleTokenRequest} className="space-y-4">
            <p className="text-sm text-gray-500">
              Request a clock-in token from HR. Once approved, you will be automatically clocked in.
            </p>
            {actionError && (
              <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{actionError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Location</label>
              <select
                value={tokenReqLocationId}
                onChange={e => setTokenReqLocationId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select your location...</option>
                {acceptableLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={tokenReqReason}
                onChange={e => setTokenReqReason(e.target.value)}
                required
                rows={3}
                placeholder="Why do you need a token? (e.g. QR scanner not working, phone unavailable...)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={!tokenReqLocationId || !tokenReqReason.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Submit Request
            </button>
          </form>
        </Modal>
      )}

      {/* ── Overtime Modal ────────────────────────────────────────────────── */}
      {showOTModal && (
        <Modal title="Request Overtime" onClose={() => setShowOTModal(false)} size="sm">
          <form onSubmit={handleOTRequest} className="space-y-4">
            <p className="text-sm text-gray-500">Submit an overtime request to your supervisor.</p>
            {actionError && (
              <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{actionError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={otDate}
                onChange={e => setOtDate(e.target.value)}
                required
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={otReason}
                onChange={e => setOtReason(e.target.value)}
                required
                rows={3}
                placeholder="Describe why overtime is needed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Submit Request
            </button>
          </form>
        </Modal>
      )}

      {/* ── Early Departure Modal (only when leaving significantly early) ─── */}
      {showEarlyModal && (
        <Modal title="Clock Out" onClose={() => setShowEarlyModal(false)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are leaving significantly earlier than your normal end time. Please share a short reason.
              This helps your supervisor and HR understand and plan around early departures.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
              <textarea
                value={earlyReason}
                onChange={e => setEarlyReason(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="E.g. medical appointment, family emergency, study commitment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-400">
                This note is visible to your supervisor and HR only.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowEarlyModal(false)}
                className="px-3 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEarlyDeparture}
                disabled={!earlyReason.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Clock Out
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Clock Out Confirmation (on-time or late) ───────────────────────── */}
      {showConfirmModal && (
        <Modal title="Clock Out" onClose={() => setShowConfirmModal(false)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to clock out?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClockOut}
                className="px-4 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600"
              >
                Yes, Clock Out
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
