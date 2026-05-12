import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import {
  getHRLeaveRequests, reviewLeaveRequest,
  hrLogEarlyReturn, reviewExtensionRequest,
} from '../../services/api';
import type { LeaveRequest } from '../../types';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, RotateCcw, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

type TabKey = 'pending' | 'active' | 'extensions' | 'all';

const LEAVE_LABELS: Record<string, string> = {
  paid:      'Paid Leave',
  sick:      'Sick Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
};

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'purple'> = {
  pending:      'neutral',
  approved:     'info',
  denied:       'danger',
  active:       'success',
  completed:    'purple',
  early_return: 'warning',
};

export function HRLeaveContent() {
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<TabKey>('pending');
  const [msg,         setMsg]         = useState('');
  const [error,       setError]       = useState('');
  const [expanded,    setExpanded]    = useState<Set<number>>(new Set());

  // Review modal
  const [reviewModal,  setReviewModal]  = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny'>('approve');
  const [hrNote,       setHrNote]       = useState('');
  const [reviewError,  setReviewError]  = useState('');

  // Early return modal (HR side)
  const [earlyModal,  setEarlyModal]  = useState<LeaveRequest | null>(null);
  const [earlyDate,   setEarlyDate]   = useState('');
  const [earlyReason, setEarlyReason] = useState('');
  const [earlyError,  setEarlyError]  = useState('');

  // Extension review modal
  const [extModal,    setExtModal]    = useState<{ extId: number; requester: string; days: number; reason: string } | null>(null);
  const [extAction,   setExtAction]   = useState<'approve' | 'deny'>('approve');
  const [extNote,     setExtNote]     = useState('');
  const [extError,    setExtError]    = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const data = await getHRLeaveRequests();
      setAllRequests(data);
    } catch {}
    setLoading(false);
  }

  const pending    = allRequests.filter(r => r.status === 'pending');
  const active     = allRequests.filter(r => ['active', 'approved'].includes(r.status));
  const withPendingExt = allRequests.filter(r =>
    (r.extensions || []).some(e => e.status === 'pending')
  );

  const displayed: LeaveRequest[] = tab === 'pending'    ? pending
    : tab === 'active'     ? active
    : tab === 'extensions' ? withPendingExt
    : allRequests;

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewModal) return;
    setReviewError('');
    try {
      await reviewLeaveRequest(reviewModal.id, reviewAction, hrNote);
      setMsg(`Leave request ${reviewAction === 'approve' ? 'approved' : 'denied'} successfully.`);
      setReviewModal(null);
      setHrNote('');
      fetchAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setReviewError(e.response?.data?.error || 'Action failed.');
    }
  }

  async function handleEarlyReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!earlyModal) return;
    setEarlyError('');
    try {
      await hrLogEarlyReturn(earlyModal.id, earlyDate, earlyReason);
      setMsg('Early return logged and unused days refunded.');
      setEarlyModal(null);
      setEarlyDate('');
      setEarlyReason('');
      fetchAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setEarlyError(e.response?.data?.error || 'Failed.');
    }
  }

  async function handleExtReview(e: React.FormEvent) {
    e.preventDefault();
    if (!extModal) return;
    setExtError('');
    try {
      await reviewExtensionRequest(extModal.extId, extAction, extNote);
      setMsg(`Extension ${extAction === 'approve' ? 'approved' : 'denied'}.`);
      setExtModal(null);
      setExtNote('');
      fetchAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setExtError(e.response?.data?.error || 'Failed.');
    }
  }

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'pending',    label: 'Pending',    count: pending.length },
    { key: 'active',     label: 'Active',     count: active.length },
    { key: 'extensions', label: 'Extensions', count: withPendingExt.reduce((n, r) => n + (r.extensions || []).filter(e => e.status === 'pending').length, 0) },
    { key: 'all',        label: 'All' },
  ];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-app">Leave Management</h1>
          <p className="text-sm text-app-muted mt-0.5">Review, approve and manage employee leave requests</p>
        </div>

        {msg   && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg}<button onClick={() => setMsg('')} className="ml-2 font-bold">✕</button></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}<button onClick={() => setError('')} className="ml-2 font-bold">✕</button></div>}

        {/* Tabs */}
        <div className="flex gap-1 bg-app-border-subtle rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                tab === t.key ? 'bg-app-surface shadow-sm text-app' : 'text-app-muted hover:text-app'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  tab === t.key ? 'bg-blue-100 text-app-nav-active-text' : 'bg-app-border text-app-muted'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-app-surface rounded-xl border border-app-border-subtle p-8 text-center text-app-subtle text-sm">
            No requests in this category.
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(lr => {
              const isExpanded = expanded.has(lr.id);
              const pendingExts = (lr.extensions || []).filter(e => e.status === 'pending');

              return (
                <div key={lr.id} className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
                  <div className="px-4 py-4 flex flex-wrap items-start gap-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-app">{lr.employee_name}</span>
                        <span className="text-xs text-app-subtle">{lr.department_name}</span>
                        <Badge variant={STATUS_VARIANT[lr.status] || 'neutral'}>
                          {lr.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-app">
                        <span className="font-medium capitalize">{LEAVE_LABELS[lr.leave_type] || lr.leave_type}</span>
                        {' · '}
                        {format(new Date(lr.start_date), 'd MMM yyyy')}
                        {' '}<ArrowRight size={11} className="inline" />{' '}
                        {format(new Date(lr.end_date), 'd MMM yyyy')}
                        {' · '}<strong>{lr.days_requested}</strong> days
                      </p>
                      <p className="text-xs text-app-muted mt-0.5 line-clamp-2">{lr.description}</p>
                      {lr.hr_note && (
                        <p className="text-xs mt-1 text-orange-600">HR note: {lr.hr_note}</p>
                      )}
                      {lr.actual_return_date && (
                        <p className="text-xs mt-1 text-amber-700 bg-amber-50 rounded px-2 py-1 inline-block">
                          Returned early on {format(new Date(lr.actual_return_date), 'd MMM yyyy')}: {lr.early_return_reason}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {lr.status === 'pending' && (
                        <>
                          <button
                            onClick={() => { setReviewModal(lr); setReviewAction('approve'); setHrNote(''); setReviewError(''); }}
                            className="flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg"
                          >
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            onClick={() => { setReviewModal(lr); setReviewAction('deny'); setHrNote(''); setReviewError(''); }}
                            className="flex items-center gap-1.5 text-xs bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg"
                          >
                            <XCircle size={13} /> Deny
                          </button>
                        </>
                      )}
                      {['active', 'approved'].includes(lr.status) && (
                        <button
                          onClick={() => { setEarlyModal(lr); setEarlyDate(new Date().toISOString().slice(0, 10)); setEarlyReason(''); setEarlyError(''); }}
                          className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg"
                        >
                          <RotateCcw size={12} /> Log Early Return
                        </button>
                      )}
                      {(lr.extensions || []).length > 0 && (
                        <button onClick={() => toggleExpand(lr.id)} className="flex items-center gap-1 text-xs text-app-muted hover:text-app">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {lr.extensions!.length} ext{lr.extensions!.length > 1 ? 's' : ''}
                          {pendingExts.length > 0 && (
                            <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-1.5 rounded-full">{pendingExts.length}</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Extension list */}
                  {isExpanded && (lr.extensions || []).length > 0 && (
                    <div className="px-4 pb-4 border-t border-app-border-subtle pt-3 space-y-2">
                      <p className="text-xs font-semibold text-app-muted uppercase">Extension Requests</p>
                      {lr.extensions!.map(ext => (
                        <div key={ext.id} className="flex flex-wrap items-start justify-between gap-2 bg-app-page rounded-lg px-3 py-2">
                          <div className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">+{ext.extra_days} days</span>
                              <Badge variant={STATUS_VARIANT[ext.status] || 'neutral'}>{ext.status}</Badge>
                            </div>
                            <p className="text-app-muted mt-0.5">{ext.reason}</p>
                            {ext.hr_note && <p className="text-orange-600 mt-0.5">HR: {ext.hr_note}</p>}
                          </div>
                          {ext.status === 'pending' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setExtModal({ extId: ext.id, requester: lr.employee_name || '', days: ext.extra_days, reason: ext.reason }); setExtAction('approve'); setExtNote(''); setExtError(''); }}
                                className="text-xs bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 px-2 py-1 rounded"
                              >Approve</button>
                              <button
                                onClick={() => { setExtModal({ extId: ext.id, requester: lr.employee_name || '', days: ext.extra_days, reason: ext.reason }); setExtAction('deny'); setExtNote(''); setExtError(''); }}
                                className="text-xs bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-2 py-1 rounded"
                              >Deny</button>
                            </div>
                          )}
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

      {/* ── Review Modal ───────────────────────────────────────────────── */}
      {reviewModal && (
        <Modal
          title={`${reviewAction === 'approve' ? 'Approve' : 'Deny'} Leave Request`}
          onClose={() => setReviewModal(null)}
          size="sm"
        >
          <form onSubmit={handleReview} className="space-y-4">
            {reviewError && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{reviewError}</div>}
            <div className="bg-app-page rounded-xl p-3 text-sm space-y-1">
              <p><span className="text-app-muted">Employee:</span> <strong>{reviewModal.employee_name}</strong></p>
              <p><span className="text-app-muted">Leave type:</span> {LEAVE_LABELS[reviewModal.leave_type]}</p>
              <p><span className="text-app-muted">Dates:</span> {format(new Date(reviewModal.start_date), 'd MMM')} → {format(new Date(reviewModal.end_date), 'd MMM yyyy')} ({reviewModal.days_requested} days)</p>
              <p className="text-app-muted text-xs mt-1">{reviewModal.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app mb-1">
                {reviewAction === 'deny' ? 'Reason for Denial (required)' : 'Note (optional)'}
              </label>
              <textarea
                value={hrNote}
                onChange={e => setHrNote(e.target.value)}
                required={reviewAction === 'deny'}
                rows={3}
                placeholder={reviewAction === 'deny' ? 'Explain why this request is being denied…' : 'Optional note for the employee…'}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent resize-none"
              />
            </div>
            <button
              type="submit"
              className={`w-full py-2.5 rounded-lg text-sm font-medium text-white ${
                reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {reviewAction === 'approve' ? 'Approve Request' : 'Deny Request'}
            </button>
          </form>
        </Modal>
      )}

      {/* ── HR Early Return Modal ──────────────────────────────────────── */}
      {earlyModal && (
        <Modal title={`Log Early Return — ${earlyModal.employee_name}`} onClose={() => setEarlyModal(null)} size="sm">
          <form onSubmit={handleEarlyReturn} className="space-y-4">
            {earlyError && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{earlyError}</div>}
            <p className="text-sm text-app-muted">
              Scheduled leave until {format(new Date(earlyModal.end_date), 'd MMM yyyy')}.
              Unused days will be refunded to the employee's balance.
            </p>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Actual Return Date</label>
              <input
                type="date"
                value={earlyDate}
                onChange={e => setEarlyDate(e.target.value)}
                required
                min={earlyModal.start_date}
                max={earlyModal.end_date}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Reason</label>
              <textarea
                value={earlyReason}
                onChange={e => setEarlyReason(e.target.value)}
                required
                rows={2}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent resize-none"
              />
            </div>
            <button type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Confirm Early Return
            </button>
          </form>
        </Modal>
      )}

      {/* ── Extension Review Modal ─────────────────────────────────────── */}
      {extModal && (
        <Modal title="Review Extension Request" onClose={() => setExtModal(null)} size="sm">
          <form onSubmit={handleExtReview} className="space-y-4">
            {extError && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{extError}</div>}
            <div className="bg-app-page rounded-xl p-3 text-sm">
              <p><strong>{extModal.requester}</strong> requests <strong>+{extModal.days} days</strong></p>
              <p className="text-app-muted text-xs mt-1">{extModal.reason}</p>
            </div>
            <div className="flex gap-2">
              {(['approve', 'deny'] as const).map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setExtAction(a)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    extAction === a
                      ? a === 'approve' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                      : 'bg-app-surface text-app-muted border-app-input-border hover:bg-app-page'
                  }`}
                >
                  {a === 'approve' ? 'Approve' : 'Deny'}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Note (optional)</label>
              <textarea
                value={extNote}
                onChange={e => setExtNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent resize-none"
              />
            </div>
            <button type="submit"
              className={`w-full py-2.5 rounded-lg text-sm font-medium text-white ${
                extAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {extAction === 'approve' ? 'Approve Extension' : 'Deny Extension'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function HRLeavePage() {
  return (
    <Layout>
      <HRLeaveContent />
    </Layout>
  );
}
