import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import {
  getMyLeaveRequests, getEmployeeDashboard,
  requestLeave, logMyEarlyReturn, requestLeaveExtension,
} from '../../services/api';
import type { LeaveRequest, LeaveBalance } from '../../types';
import { format } from 'date-fns';
import { Plus, CalendarCheck, RotateCcw, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

function formatLeaveLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Leave';
}

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'purple'> = {
  pending:      'neutral',
  approved:     'info',
  denied:       'danger',
  active:       'success',
  completed:    'purple',
  early_return: 'warning',
};

function countWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0;
  let count = 0;
  const s = new Date(start), e = new Date(end);
  for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return count;
}

export default function EmployeeLeavePage() {
  const [requests,  setRequests]  = useState<LeaveRequest[]>([]);
  const [balances,  setBalances]  = useState<LeaveBalance[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState('');
  const [error,     setError]     = useState('');
  const [expanded,  setExpanded]  = useState<Set<number>>(new Set());

  // New request form
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ leave_type: '', description: '', start_date: '', end_date: '' });
  const [formError,  setFormError]  = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Early return modal
  const [earlyModal,    setEarlyModal]    = useState<LeaveRequest | null>(null);
  const [earlyDate,     setEarlyDate]     = useState('');
  const [earlyReason,   setEarlyReason]   = useState('');
  const [earlyError,    setEarlyError]    = useState('');

  // Extension modal
  const [extModal,    setExtModal]    = useState<LeaveRequest | null>(null);
  const [extDays,     setExtDays]     = useState('');
  const [extReason,   setExtReason]   = useState('');
  const [extError,    setExtError]    = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [reqs, dash] = await Promise.all([getMyLeaveRequests(), getEmployeeDashboard()]);
      setRequests(reqs);
      setBalances(dash.leave_balances || []);
    } catch {}
    setLoading(false);
  }

  const today = new Date().toISOString().slice(0, 10);
  const workingDaysPreview = countWorkingDays(form.start_date, form.end_date);
  const selectedBalance = balances.find(b => b.leave_type === form.leave_type);

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await requestLeave(form);
      setMsg('Leave request submitted successfully.');
      setShowForm(false);
      setForm({ leave_type: '', description: '', start_date: '', end_date: '' });
      fetchAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setFormError(e.response?.data?.error || 'Failed to submit request.');
    }
    setSubmitting(false);
  }

  async function handleEarlyReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!earlyModal) return;
    setEarlyError('');
    try {
      await logMyEarlyReturn(earlyModal.id, earlyDate, earlyReason);
      setMsg('Early return logged. Unused days have been refunded to your balance.');
      setEarlyModal(null);
      setEarlyDate('');
      setEarlyReason('');
      fetchAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setEarlyError(e.response?.data?.error || 'Failed to log early return.');
    }
  }

  async function handleExtension(e: React.FormEvent) {
    e.preventDefault();
    if (!extModal) return;
    setExtError('');
    try {
      await requestLeaveExtension(extModal.id, parseFloat(extDays), extReason);
      setMsg('Extension request submitted. HR will review it.');
      setExtModal(null);
      setExtDays('');
      setExtReason('');
      fetchAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setExtError(e.response?.data?.error || 'Failed to submit extension.');
    }
  }

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <Layout>
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Leave</h1>
            <p className="text-sm text-gray-500 mt-0.5">View your leave balances and manage requests</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setFormError(''); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> Request Leave
          </button>
        </div>

        {msg   && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg}<button onClick={() => setMsg('')} className="ml-2 font-bold">✕</button></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}<button onClick={() => setError('')} className="ml-2 font-bold">✕</button></div>}

        {/* Leave balances */}
        {balances.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Leave Balances ({new Date().getFullYear()})</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {balances.map(lb => {
                const pct = lb.days_allocated > 0 ? Math.round((lb.days_used / lb.days_allocated) * 100) : 0;
                return (
                  <div key={lb.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {formatLeaveLabel(lb.leave_type)}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{lb.days_remaining}</p>
                    <p className="text-xs text-gray-400 mb-2">of {lb.days_allocated} days remaining</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{lb.days_used} used</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Requests list */}
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">My Requests</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              No leave requests yet. Click <strong>Request Leave</strong> to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(lr => {
                const isExpanded = expanded.has(lr.id);
                const canEarlyReturn = ['active', 'approved'].includes(lr.status);
                const canExtend      = ['active', 'approved'].includes(lr.status)
                  && !(lr.extensions || []).some(e => e.status === 'pending');

                return (
                  <div key={lr.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-4 flex flex-wrap items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 capitalize">
                            {formatLeaveLabel(lr.leave_type)}
                          </span>
                          <Badge variant={STATUS_VARIANT[lr.status] || 'neutral'}>
                            {lr.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {format(new Date(lr.start_date), 'd MMM yyyy')}
                          {' '}<ArrowRight size={12} className="inline" />{' '}
                          {format(new Date(lr.end_date), 'd MMM yyyy')}
                          {' · '}<strong>{lr.days_requested}</strong> working days
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{lr.description}</p>
                        {lr.hr_note && (
                          <p className="text-xs mt-1 text-orange-600 bg-orange-50 rounded px-2 py-1 inline-block">
                            HR note: {lr.hr_note}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {canEarlyReturn && (
                          <button
                            onClick={() => { setEarlyModal(lr); setEarlyDate(today); setEarlyReason(''); setEarlyError(''); }}
                            className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg"
                          >
                            <RotateCcw size={12} /> Early Return
                          </button>
                        )}
                        {canExtend && (
                          <button
                            onClick={() => { setExtModal(lr); setExtDays(''); setExtReason(''); setExtError(''); }}
                            className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
                          >
                            <CalendarCheck size={12} /> Request Extension
                          </button>
                        )}
                        {(lr.extensions || []).length > 0 && (
                          <button
                            onClick={() => toggleExpand(lr.id)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {lr.extensions!.length} extension{lr.extensions!.length > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Early return detail */}
                    {lr.actual_return_date && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
                          Early return on {format(new Date(lr.actual_return_date), 'd MMM yyyy')}: {lr.early_return_reason}
                        </p>
                      </div>
                    )}

                    {/* Extension requests */}
                    {isExpanded && (lr.extensions || []).length > 0 && (
                      <div className="px-4 pb-3 border-t border-gray-50 pt-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Extension Requests</p>
                        {lr.extensions!.map(ext => (
                          <div key={ext.id} className="text-xs bg-gray-50 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">+{ext.extra_days} days</span>
                              <Badge variant={STATUS_VARIANT[ext.status] || 'neutral'}>{ext.status}</Badge>
                            </div>
                            <p className="text-gray-500 mt-0.5">{ext.reason}</p>
                            {ext.hr_note && <p className="text-orange-600 mt-0.5">HR: {ext.hr_note}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── New Request Modal ─────────────────────────────────────────── */}
      {showForm && (
        <Modal title="Request Leave" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            {formError && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{formError}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select
                value={form.leave_type}
                onChange={e => setForm({ ...form, leave_type: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select leave type…</option>
                {balances.map(b => (
                  <option key={b.leave_type} value={b.leave_type}>
                    {formatLeaveLabel(b.leave_type)} ({b.days_remaining} days remaining)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  required
                  min={today}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                  required
                  min={form.start_date || today}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Working days preview */}
            {form.start_date && form.end_date && (
              <div className={`text-sm rounded-lg px-3 py-2 ${
                selectedBalance && workingDaysPreview > selectedBalance.days_remaining
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {workingDaysPreview} working day{workingDaysPreview !== 1 ? 's' : ''} selected
                {selectedBalance && (
                  <span className="ml-2 text-xs">
                    (balance: {selectedBalance.days_remaining})
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
                rows={3}
                placeholder="Describe the reason for your leave…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !form.leave_type || !form.start_date || !form.end_date || workingDaysPreview === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Early Return Modal ────────────────────────────────────────── */}
      {earlyModal && (
        <Modal title="Log Early Return" onClose={() => setEarlyModal(null)} size="sm">
          <form onSubmit={handleEarlyReturn} className="space-y-4">
            {earlyError && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{earlyError}</div>}
            <p className="text-sm text-gray-500">
              Recording an early return will refund unused days to your balance.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Return Date</label>
              <input
                type="date"
                value={earlyDate}
                onChange={e => setEarlyDate(e.target.value)}
                required
                min={earlyModal.start_date}
                max={earlyModal.end_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Early Return</label>
              <textarea
                value={earlyReason}
                onChange={e => setEarlyReason(e.target.value)}
                required
                rows={3}
                placeholder="Why are you returning early?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Log Early Return
            </button>
          </form>
        </Modal>
      )}

      {/* ── Extension Modal ───────────────────────────────────────────── */}
      {extModal && (
        <Modal title="Request Leave Extension" onClose={() => setExtModal(null)} size="sm">
          <form onSubmit={handleExtension} className="space-y-4">
            {extError && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{extError}</div>}
            <p className="text-sm text-gray-500">
              Request additional working days beyond your current end date
              ({format(new Date(extModal.end_date), 'd MMM yyyy')}).
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extra Working Days</label>
              <input
                type="number"
                value={extDays}
                onChange={e => setExtDays(e.target.value)}
                required
                min={1}
                step={1}
                placeholder="e.g. 5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Extension</label>
              <textarea
                value={extReason}
                onChange={e => setExtReason(e.target.value)}
                required
                rows={3}
                placeholder="Explain why you need more time…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Submit Extension Request
            </button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
