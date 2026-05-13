import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { getSupervisorOvertimeRequests, actionOvertimeRequest } from '../../services/api';
import type { OvertimeRequest } from '../../types';
import { format } from 'date-fns';

export default function SupervisorOvertimePage() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchRequests(); }, [filter]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const data = await getSupervisorOvertimeRequests(filter || undefined);
      setRequests(data);
    } catch {}
    setLoading(false);
  }

  async function handleApprove(id: number) {
    try {
      await actionOvertimeRequest(id, 'approve');
      setMsg('Request approved and forwarded to HR.');
      fetchRequests();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectModal) return;
    try {
      await actionOvertimeRequest(rejectModal.id, 'reject', rejectReason);
      setMsg('Request rejected.');
      setRejectModal(null);
      setRejectReason('');
      fetchRequests();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
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
        <h1 className="text-2xl font-bold text-app">Overtime Requests</h1>

        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {msg} <button onClick={() => setMsg('')} className="ml-2">✕</button>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error} <button onClick={() => setError('')} className="ml-2">✕</button>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2">
          {['', 'pending', 'supervisor_approved', 'hr_approved', 'rejected'].map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filter === s ? 'bg-app-accent text-white' : 'bg-app-surface border border-app-border text-app-muted hover:bg-app-page'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-app-subtle py-12">No requests found</p>
          ) : (
            <div className="divide-y divide-app-border-subtle">
              {requests.map(req => (
                <div key={req.id} className="px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-app">{req.employee_name || `Employee #${req.employee_id}`}</span>
                        <Badge variant={statusVariant(req.status)}>{req.status.replace(/_/g, ' ')}</Badge>
                        <Badge variant={req.overtime_type === 'double' ? 'warning' : 'neutral'}>
                          {req.overtime_type === 'double' ? 'Double OT' : 'Regular OT'}
                        </Badge>
                      </div>
                      <p className="text-sm text-app">{req.reason}</p>
                      <p className="text-xs text-app-subtle mt-1">
                        Date: {format(new Date(req.requested_date + 'T12:00:00'), 'd MMM yyyy')} · Submitted: {format(new Date(req.created_at), 'd MMM yyyy')}
                      </p>
                      {req.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">Rejected: {req.rejection_reason}</p>
                      )}
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <button onClick={() => handleApprove(req.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                          Approve
                        </button>
                        <button onClick={() => setRejectModal({ id: req.id })}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {rejectModal && (
        <Modal title="Reject Request" onClose={() => setRejectModal(null)} size="sm">
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-app mb-1">Reason</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} required rows={3}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <button type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Reject
            </button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
