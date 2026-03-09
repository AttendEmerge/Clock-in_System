import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { getMyOvertimeRequests, requestOvertime } from '../../services/api';
import type { OvertimeRequest } from '../../types';
import { format } from 'date-fns';

export default function EmployeeOvertimePage() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const data = await getMyOvertimeRequests();
      setRequests(data);
    } catch {}
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await requestOvertime(reason, date);
      setMsg('Overtime request submitted.');
      setShowModal(false);
      setReason('');
      setDate('');
      fetchRequests();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to submit request.');
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Overtime Requests</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            New Request
          </button>
        </div>

        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {msg}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No overtime requests yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {requests.map(req => (
                <div key={req.id} className="px-4 py-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{req.requested_date}</span>
                      <Badge variant={statusVariant(req.status)}>{req.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{req.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Supervisor: {req.supervisor_name || 'Not assigned'} · Submitted {format(new Date(req.created_at), 'd MMM yyyy')}
                    </p>
                    {req.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">Rejected: {req.rejection_reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal title="New Overtime Request" onClose={() => setShowModal(false)} size="sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={3}
                placeholder="Describe the overtime work required..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Submit Request
            </button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
