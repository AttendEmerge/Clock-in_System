import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import StatCard from '../../components/StatCard';
import { getSupervisorDashboard, actionOvertimeRequest } from '../../services/api';
import { Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function SupervisorDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const d = await getSupervisorDashboard();
      setData(d);
    } catch {}
    setLoading(false);
  }

  async function handleApprove(id: number) {
    try {
      await actionOvertimeRequest(id, 'approve');
      setMsg('Overtime request approved and forwarded to HR.');
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Action failed.');
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectModal) return;
    try {
      await actionOvertimeRequest(rejectModal.id, 'reject', rejectReason);
      setMsg('Overtime request rejected.');
      setRejectModal(null);
      setRejectReason('');
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Action failed.');
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-app-accent" />
        </div>
      </Layout>
    );
  }

  const presentCount = data?.today_attendance?.filter((a: any) => a.clock_in).length || 0;
  const teamCount = data?.team?.length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-app">Supervisor Dashboard</h1>

        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> {msg}
            <button onClick={() => setMsg('')} className="ml-auto">✕</button>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError('')} className="ml-auto">✕</button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Team Members" value={teamCount} icon={<Users size={20} />} color="blue" />
          <StatCard label="Present Today" value={presentCount} sub={`of ${teamCount}`} icon={<CheckCircle2 size={20} />} color="green" />
          <StatCard label="Absent Today" value={teamCount - presentCount} icon={<Clock size={20} />} color="yellow" />
          <StatCard label="Pending OT Requests" value={data?.pending_overtime_requests?.length || 0} icon={<AlertCircle size={20} />} color="red" />
        </div>

        {/* Pending Overtime Requests */}
        {data?.pending_overtime_requests?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-app mb-3">Pending Overtime Requests</h2>
            <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
              <div className="divide-y divide-app-border-subtle">
                {data.pending_overtime_requests.map((req: any) => (
                  <div key={req.id} className="px-4 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-app">{req.employee_name}</p>
                        <p className="text-sm text-app-muted">{req.employee_email}</p>
                        <p className="text-sm text-app mt-1">{req.reason}</p>
                        <p className="text-xs text-app-subtle mt-1">Date: {format(new Date(req.requested_date + 'T12:00:00'), 'd MMM yyyy')}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectModal({ id: req.id })}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Today's Team Attendance */}
        <div>
          <h2 className="text-lg font-semibold text-app mb-3">Today's Team Attendance</h2>
          <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
            {data?.today_attendance?.length === 0 ? (
              <p className="text-center text-app-subtle py-8 text-sm">No attendance data yet today</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-app-page border-b border-app-border-subtle">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Clock In</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Clock Out</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border-subtle">
                    {data.today_attendance.map((att: any) => (
                      <tr key={att.user_id} className="hover:bg-app-page">
                        <td className="px-4 py-3 font-medium text-app">{att.name}</td>
                        <td className="px-4 py-3 text-app">
                          {att.clock_in ? format(new Date(att.clock_in), 'HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-3 text-app">
                          {att.clock_out ? format(new Date(att.clock_out), 'HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={att.clock_in ? 'success' : 'neutral'}>
                            {att.clock_in ? (att.clock_out ? 'Done' : 'Active') : 'Absent'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-app-muted">
                          {att.early_departure && (
                            <span className="text-amber-700 font-medium">Left early</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Team Members */}
        <div>
          <h2 className="text-lg font-semibold text-app mb-3">My Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.team?.map((member: any) => (
              <div key={member.id} className="bg-app-surface rounded-xl border border-app-border-subtle p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-app-nav-active-bg flex items-center justify-center text-app-accent font-semibold text-sm">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-app text-sm">{member.name}</p>
                  <p className="text-xs text-app-muted">{member.email}</p>
                  <Badge variant={member.role === 'supervisor' ? 'purple' : 'neutral'}>{member.role}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {rejectModal && (
        <Modal title="Reject Overtime Request" onClose={() => setRejectModal(null)} size="sm">
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-app mb-1">Reason for Rejection</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} required rows={3}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <button type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Confirm Rejection
            </button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
