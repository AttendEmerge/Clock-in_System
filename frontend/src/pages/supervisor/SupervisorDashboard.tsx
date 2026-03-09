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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  const presentCount = data?.today_attendance?.filter((a: any) => a.clock_in).length || 0;
  const teamCount = data?.team?.length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>

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
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Overtime Requests</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {data.pending_overtime_requests.map((req: any) => (
                  <div key={req.id} className="px-4 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{req.employee_name}</p>
                        <p className="text-sm text-gray-500">{req.employee_email}</p>
                        <p className="text-sm text-gray-700 mt-1">{req.reason}</p>
                        <p className="text-xs text-gray-400 mt-1">Date: {req.requested_date}</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Today's Team Attendance</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {data?.today_attendance?.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No attendance data yet today</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Clock In</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Clock Out</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.today_attendance.map((att: any) => (
                      <tr key={att.user_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{att.name}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {att.clock_in ? format(new Date(att.clock_in), 'HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {att.clock_out ? format(new Date(att.clock_out), 'HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={att.clock_in ? 'success' : 'neutral'}>
                            {att.clock_in ? (att.clock_out ? 'Done' : 'Active') : 'Absent'}
                          </Badge>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-3">My Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.team?.map((member: any) => (
              <div key={member.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} required rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
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
