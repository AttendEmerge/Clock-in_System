import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { getHROvertimeRequests, generateToken } from '../../services/api';
import type { OvertimeRequest } from '../../types';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function HROvertimePage() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('supervisor_approved');
  const [tokenModal, setTokenModal] = useState<OvertimeRequest | null>(null);
  const [approved, setApproved] = useState(false);
  const [approvedName, setApprovedName] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchRequests(); }, [filter]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const data = await getHROvertimeRequests(filter || undefined);
      setRequests(data);
    } catch {}
    setLoading(false);
  }

  async function handleApproveOvertime(req: OvertimeRequest) {
    setError('');
    try {
      await generateToken({
        for_user_id: req.employee_id,
        token_type: 'overtime',
        overtime_request_id: req.id,
      });
      setApproved(true);
      setApprovedName(req.employee_name || 'Employee');
      setMsg('Overtime approved — employee has been clocked in.');
      fetchRequests();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to approve.');
    }
  }

  const statusVariant = (s: string) => {
    if (s === 'hr_approved') return 'success';
    if (s === 'supervisor_approved') return 'info';
    if (s === 'rejected') return 'danger';
    return 'neutral';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-app">Overtime Requests</h1>
          <p className="text-app-muted text-sm mt-1">Review and approve supervisor-approved overtime requests</p>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg} <button onClick={() => setMsg('')} className="ml-2">✕</button></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error} <button onClick={() => setError('')} className="ml-2">✕</button></div>}

        <div className="flex gap-2 flex-wrap">
          {[['', 'All'], ['pending', 'Pending'], ['supervisor_approved', 'Ready for HR'], ['hr_approved', 'Approved'], ['rejected', 'Rejected']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filter === val ? 'bg-app-accent text-white' : 'bg-app-surface border border-app-border text-app-muted hover:bg-app-page'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" /></div>
          ) : requests.length === 0 ? (
            <p className="text-center text-app-subtle py-12">No requests found</p>
          ) : (
            <div className="divide-y divide-app-border-subtle">
              {requests.map(req => (
                <div key={req.id} className="px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-app">{req.employee_name}</span>
                        <Badge variant={statusVariant(req.status)}>{req.status.replace(/_/g, ' ')}</Badge>
                        <Badge variant={req.overtime_type === 'double' ? 'warning' : 'neutral'}>
                          {req.overtime_type === 'double' ? 'Double OT' : 'Regular OT'}
                        </Badge>
                      </div>
                      <p className="text-sm text-app">{req.reason}</p>
                      <p className="text-xs text-app-subtle mt-1">
                        Date: {req.requested_date} · Supervisor: {req.supervisor_name || 'N/A'} · Submitted: {format(new Date(req.created_at), 'd MMM yyyy')}
                      </p>
                    </div>
                    {req.status === 'supervisor_approved' && (
                      <button
                        onClick={() => { setTokenModal(req); setApproved(false); setError(''); }}
                        className="ml-4 flex-shrink-0 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                      >
                        Approve & Clock In
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {tokenModal && (
        <Modal title="Approve Overtime" onClose={() => { setTokenModal(null); setApproved(false); }} size="sm">
          {!approved ? (
            <div className="space-y-4">
              <div className="bg-app-page rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-app-muted">Employee</span><span className="font-medium">{tokenModal.employee_name}</span></div>
                <div className="flex justify-between"><span className="text-app-muted">Date</span><span>{tokenModal.requested_date}</span></div>
                <div className="flex justify-between"><span className="text-app-muted">Type</span><span>{tokenModal.overtime_type === 'double' ? 'Double overtime (off day)' : 'Regular overtime (workday)'}</span></div>
                <div className="flex justify-between"><span className="text-app-muted">Reason</span><span className="text-right max-w-48">{tokenModal.reason}</span></div>
              </div>
              {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
              <p className="text-sm text-app-muted">
                Approving will automatically clock the employee in for their overtime session.
              </p>
              <button onClick={() => handleApproveOvertime(tokenModal)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium">
                Approve & Clock In for Overtime
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <CheckCircle2 size={48} className="text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-app">Overtime Approved</h3>
              <p className="text-sm text-app-muted">
                {approvedName} has been automatically clocked in for their overtime session.
              </p>
              <button onClick={() => { setTokenModal(null); setApproved(false); }}
                className="w-full border border-app-border text-app-muted py-2 rounded-lg text-sm">Done</button>
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
}
