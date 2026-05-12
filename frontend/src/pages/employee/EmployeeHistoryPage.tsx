import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import { getMyClockHistory } from '../../services/api';
import type { ClockEvent } from '../../types';
import { format } from 'date-fns';

export default function EmployeeHistoryPage() {
  const [events, setEvents] = useState<ClockEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    setLoading(true);
    try {
      const data = await getMyClockHistory({ from: from || undefined, to: to || undefined });
      setEvents(data.events);
    } catch {}
    setLoading(false);
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-app">My attendance history</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-app-surface p-4 rounded-xl border border-app-border-subtle shadow-sm">
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
            <button onClick={fetchHistory}
              className="bg-app-accent hover:bg-app-accent-hover text-white px-4 py-1.5 rounded-lg text-sm font-medium">
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-center text-app-subtle py-12">No events found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-app-page border-b border-app-border-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase tracking-wider">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border-subtle">
                  {events.map(ev => (
                    <tr key={ev.id} className="hover:bg-app-page">
                      <td className="px-4 py-3 text-app">{format(new Date(ev.event_timestamp), 'd MMM yyyy')}</td>
                      <td className="px-4 py-3 text-app font-mono">{format(new Date(ev.event_timestamp), 'HH:mm:ss')}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ev.event_type === 'clock_in' ? 'success' : 'neutral'}>
                          {ev.event_type === 'clock_in' ? '→ Clock In' : '← Clock Out'}
                          {ev.is_overtime ? ' (OT)' : ''}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-app-muted capitalize">{ev.method.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        {ev.is_flagged && !ev.is_unflagged
                          ? <Badge variant="warning">⚠ {ev.flag_reason}</Badge>
                          : ev.is_flagged && ev.is_unflagged
                          ? <Badge variant="neutral">Unflagged</Badge>
                          : <Badge variant="success">OK</Badge>}
                      </td>
                      <td className="px-4 py-3 text-xs text-app-muted">
                        {ev.flag_reason?.includes('EARLY_DEPARTURE') && (
                          <div className="space-y-1">
                            <p className="font-medium text-amber-700">Early departure</p>
                            {ev.early_departure_reason && (
                              <p className="text-app-muted break-words">
                                Reason: <span className="italic">{ev.early_departure_reason}</span>
                              </p>
                            )}
                          </div>
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
    </Layout>
  );
}
