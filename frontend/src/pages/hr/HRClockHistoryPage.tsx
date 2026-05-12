import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import { getEmployeeClockHistory, getUsers } from '../../services/api';
import type { ClockEvent, User } from '../../types';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';

export function HRClockHistoryContent() {
  const [events, setEvents] = useState<ClockEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { fetchHistory(); }, [page]);

  async function fetchUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {}
  }

  async function fetchHistory() {
    setLoading(true);
    try {
      const data = await getEmployeeClockHistory({
        user_id: userId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 50,
      });
      setEvents(data.events);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-app">Attendance history</h1>

        <div className="flex flex-wrap gap-3 bg-app-surface p-4 rounded-xl border border-app-border-subtle shadow-sm">
          <select value={userId} onChange={e => setUserId(e.target.value)}
            className="border border-app-input-border rounded-lg px-3 py-2 text-sm focus:outline-none min-w-48">
            <option value="">All Employees</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <div>
            <label className="block text-xs text-app-muted mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-app-input-border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-app-muted mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-app-input-border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={() => { setPage(1); fetchHistory(); }}
              className="bg-app-accent hover:bg-app-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium">
              Filter
            </button>
          </div>
        </div>

        <div className="text-sm text-app-muted">{total} total records</div>

        <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" /></div>
          ) : events.length === 0 ? (
            <p className="text-center text-app-subtle py-12">No events found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-app-page border-b border-app-border-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Dept</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border-subtle">
                  {events.map(ev => (
                    <tr key={ev.id} className={`hover:bg-app-page ${ev.is_flagged && !ev.is_unflagged ? 'bg-yellow-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-app">{ev.user_name}</p>
                        <p className="text-xs text-app-subtle">{ev.email}</p>
                      </td>
                      <td className="px-4 py-3 text-app-muted text-xs">{ev.department_name || '—'}</td>
                      <td className="px-4 py-3 text-app">{format(new Date(ev.event_timestamp), 'd MMM yyyy HH:mm')}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ev.event_type === 'clock_in' ? 'success' : 'neutral'}>
                          {ev.event_type === 'clock_in' ? '→ In' : '← Out'}
                          {ev.is_overtime ? ' (OT)' : ''}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-app-muted capitalize text-xs">{ev.method.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        {ev.latitude != null
                          ? <a href={`https://maps.google.com/?q=${ev.latitude},${ev.longitude}`} target="_blank" rel="noopener"
                              className="flex items-center gap-1 text-app-accent hover:underline text-xs">
                              <MapPin size={11} /> View
                            </a>
                          : <span className="text-app-subtle text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {ev.is_flagged && !ev.is_unflagged
                          ? <Badge variant="warning">⚠ {ev.flag_reason?.replace(',', ', ')}</Badge>
                          : ev.is_flagged && ev.is_unflagged
                          ? <Badge variant="neutral">Cleared</Badge>
                          : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-app-input-border rounded-lg text-sm disabled:opacity-40">Previous</button>
            <span className="px-3 py-1.5 text-sm text-app-muted">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 border border-app-input-border rounded-lg text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
  );
}

export default function HRClockHistoryPage() {
  return (
    <Layout>
      <HRClockHistoryContent />
    </Layout>
  );
}
