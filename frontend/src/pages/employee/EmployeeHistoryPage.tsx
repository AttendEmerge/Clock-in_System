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
        <h1 className="text-2xl font-bold text-gray-900">My Clock History</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={fetchHistory}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No events found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {events.map(ev => (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{format(new Date(ev.event_timestamp), 'd MMM yyyy')}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono">{format(new Date(ev.event_timestamp), 'HH:mm:ss')}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ev.event_type === 'clock_in' ? 'success' : 'neutral'}>
                          {ev.event_type === 'clock_in' ? '→ Clock In' : '← Clock Out'}
                          {ev.is_overtime ? ' (OT)' : ''}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{ev.method.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        {ev.is_flagged && !ev.is_unflagged
                          ? <Badge variant="warning">⚠ {ev.flag_reason}</Badge>
                          : ev.is_flagged && ev.is_unflagged
                          ? <Badge variant="neutral">Unflagged</Badge>
                          : <Badge variant="success">OK</Badge>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {ev.flag_reason?.includes('EARLY_DEPARTURE') && (
                          <div className="space-y-1">
                            <p className="font-medium text-amber-700">Early departure</p>
                            {ev.early_departure_reason && (
                              <p className="text-gray-500 break-words">
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
