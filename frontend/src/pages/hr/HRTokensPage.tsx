import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { generateToken, getTokens, getUsers, getHRTokenRequests, actionTokenRequest } from '../../services/api';
import type { OneTimeToken, User } from '../../types';
import { Plus, Copy, Check, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TokenRequest {
  id: number;
  user_id: number;
  employee_name: string;
  employee_email: string;
  location_name: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function HRTokensContent() {
  const [tokens, setTokens] = useState<OneTimeToken[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tokenRequests, setTokenRequests] = useState<TokenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ for_user_id: '', token_type: 'regular', overtime_request_id: '' });
  const [generatedToken, setGeneratedToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [filterUsed, setFilterUsed] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'requests' | 'tokens'>('requests');
  const [rejectModal, setRejectModal] = useState<TokenRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => { fetchData(); }, [filterUsed]);

  async function fetchData() {
    setLoading(true);
    try {
      const [t, u, tr] = await Promise.all([
        getTokens({ used: filterUsed || undefined }),
        getUsers(),
        getHRTokenRequests({ status: 'pending' }),
      ]);
      setTokens(t);
      setUsers(u);
      setTokenRequests(tr);
    } catch {}
    setLoading(false);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await generateToken({
        for_user_id: parseInt(form.for_user_id),
        token_type: form.token_type,
        overtime_request_id: form.overtime_request_id ? parseInt(form.overtime_request_id) : undefined,
      });
      setGeneratedToken(data.token);
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to generate token.');
    }
  }

  async function handleApproveRequest(req: TokenRequest) {
    try {
      await actionTokenRequest(req.id, { action: 'approve' });
      setMsg(`Approved — ${req.employee_name} has been clocked in.`);
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to approve.');
    }
  }

  async function handleRejectRequest() {
    if (!rejectModal) return;
    try {
      await actionTokenRequest(rejectModal.id, { action: 'reject', hr_note: rejectNote || undefined });
      setMsg(`Token request from ${rejectModal.employee_name} rejected.`);
      setRejectModal(null);
      setRejectNote('');
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to reject.');
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pendingCount = tokenRequests.length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-app">Tokens</h1>
          <button onClick={() => { setShowModal(true); setGeneratedToken(''); setForm({ for_user_id: '', token_type: 'regular', overtime_request_id: '' }); }}
            className="flex items-center gap-2 bg-app-accent hover:bg-app-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Generate Token
          </button>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg} <button onClick={() => setMsg('')} className="ml-2">✕</button></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error} <button onClick={() => setError('')} className="ml-2">✕</button></div>}

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-app-border">
          <button
            onClick={() => setTab('requests')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'requests' ? 'border-app-accent text-app-accent' : 'border-transparent text-app-muted hover:text-app'
            }`}
          >
            Pending Requests {pendingCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
          </button>
          <button
            onClick={() => setTab('tokens')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'tokens' ? 'border-app-accent text-app-accent' : 'border-transparent text-app-muted hover:text-app'
            }`}
          >
            Generated Tokens
          </button>
        </div>

        {/* Pending Requests Tab */}
        {tab === 'requests' && (
          <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" /></div>
            ) : tokenRequests.length === 0 ? (
              <p className="text-center text-app-subtle py-12">No pending token requests</p>
            ) : (
              <div className="divide-y divide-app-border-subtle">
                {tokenRequests.map(req => (
                  <div key={req.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-app">{req.employee_name}</span>
                          <span className="text-xs text-app-subtle">{req.employee_email}</span>
                        </div>
                        <p className="text-sm text-app-muted mb-1">{req.reason}</p>
                        <div className="flex gap-3 text-xs text-app-subtle">
                          <span>Location: <strong className="text-app-muted">{req.location_name}</strong></span>
                          <span>{format(new Date(req.created_at), 'd MMM yyyy HH:mm')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApproveRequest(req)}
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          <CheckCircle2 size={14} /> Approve & Clock In
                        </button>
                        <button
                          onClick={() => { setRejectModal(req); setRejectNote(''); }}
                          className="flex items-center gap-1.5 bg-app-surface border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generated Tokens Tab */}
        {tab === 'tokens' && (
          <>
            <div className="flex gap-2">
              {[['', 'All'], ['false', 'Active'], ['true', 'Used']].map(([val, label]) => (
                <button key={val} onClick={() => setFilterUsed(val)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${filterUsed === val ? 'bg-app-accent text-white' : 'bg-app-surface border border-app-border text-app-muted hover:bg-app-page'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" /></div>
              ) : tokens.length === 0 ? (
                <p className="text-center text-app-subtle py-12">No tokens found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-app-page border-b border-app-border-subtle">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Token</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">For</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Generated By</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Expires</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border-subtle">
                      {tokens.map(t => (
                        <tr key={t.id} className="hover:bg-app-page">
                          <td className="px-4 py-3 font-mono font-bold text-app">{t.plain_token}</td>
                          <td className="px-4 py-3 text-app">{t.for_user_name}</td>
                          <td className="px-4 py-3">
                            <Badge variant={t.token_type === 'overtime' ? 'warning' : 'info'}>{t.token_type}</Badge>
                          </td>
                          <td className="px-4 py-3 text-app-muted">{t.generated_by_name}</td>
                          <td className="px-4 py-3 text-app-muted text-xs">{format(new Date(t.expires_at), 'd MMM HH:mm')}</td>
                          <td className="px-4 py-3">
                            <Badge variant={t.used_at ? 'neutral' : new Date(t.expires_at) < new Date() ? 'danger' : 'success'}>
                              {t.used_at ? 'Used' : new Date(t.expires_at) < new Date() ? 'Expired' : 'Active'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Generate Token Modal */}
      {showModal && (
        <Modal title="Generate One-Time Token" onClose={() => setShowModal(false)} size="sm">
          {!generatedToken ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-app mb-1">Employee</label>
                <select value={form.for_user_id} onChange={e => setForm({ ...form, for_user_id: e.target.value })} required
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none">
                  <option value="">Select employee...</option>
                  {users.filter(u => u.role !== 'hr').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-app mb-1">Token Type</label>
                <select value={form.token_type} onChange={e => setForm({ ...form, token_type: e.target.value })}
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none">
                  <option value="regular">Regular (Clock-in)</option>
                  <option value="overtime">Overtime (Post-hours clock-in)</option>
                </select>
              </div>
              {form.token_type === 'overtime' && (
                <div>
                  <label className="block text-sm font-medium text-app mb-1">Overtime Request ID (optional)</label>
                  <input type="number" value={form.overtime_request_id} onChange={e => setForm({ ...form, overtime_request_id: e.target.value })}
                    placeholder="Leave blank if not linked"
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
                </div>
              )}
              <button type="submit"
                className="w-full bg-app-accent hover:bg-app-accent-hover text-white py-2.5 rounded-lg text-sm font-medium">
                Generate Token
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="bg-green-50 rounded-xl p-6">
                <p className="text-sm text-app-muted mb-2">Token generated — share with employee:</p>
                <p className="text-3xl font-mono font-bold text-app tracking-widest">{generatedToken}</p>
              </div>
              <button onClick={copyToken}
                className="flex items-center gap-2 mx-auto bg-app-border-subtle hover:bg-app-border text-app px-4 py-2 rounded-lg text-sm font-medium">
                {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Token</>}
              </button>
              <p className="text-xs text-app-subtle">Token expires in 60 minutes and can only be used once.</p>
              <button onClick={() => { setGeneratedToken(''); setShowModal(false); }}
                className="w-full border border-app-border text-app-muted py-2 rounded-lg text-sm">
                Done
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal title="Reject Token Request" onClose={() => setRejectModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-app-muted">
              Reject the token request from <strong>{rejectModal.employee_name}</strong>?
            </p>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Note (optional)</label>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                rows={3}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent resize-none"
              />
            </div>
            <button
              onClick={handleRejectRequest}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Reject Request
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function HRTokensPage() {
  return (
    <Layout>
      <HRTokensContent />
    </Layout>
  );
}
