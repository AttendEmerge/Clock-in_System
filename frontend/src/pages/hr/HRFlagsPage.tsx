import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { getFlaggedEvents, unflagEvent } from '../../services/api';
import type { ClockEvent } from '../../types';
import { Flag, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export function HRFlagsContent() {
  const [events, setEvents] = useState<ClockEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unflagModal, setUnflagModal] = useState<ClockEvent | null>(null);
  const [addLocation, setAddLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [radius, setRadius] = useState(200);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchFlags(); }, [page]);

  async function fetchFlags() {
    setLoading(true);
    try {
      const data = await getFlaggedEvents({ page, limit: 20 });
      setEvents(data.events);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }

  async function handleUnflag(e: React.FormEvent) {
    e.preventDefault();
    if (!unflagModal) return;
    try {
      await unflagEvent(unflagModal.id, {
        add_to_acceptable_locations: addLocation,
        location_name: locationName || undefined,
        radius_meters: radius,
      });
      setMsg('Event unflagged successfully.' + (addLocation ? ' Location added to acceptable list.' : ''));
      setUnflagModal(null);
      setAddLocation(false);
      setLocationName('');
      fetchFlags();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flagged Events</h1>
          <p className="text-gray-500 text-sm mt-1">{total} event(s) requiring review</p>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg} <button onClick={() => setMsg('')} className="ml-2">✕</button></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error} <button onClick={() => setError('')} className="ml-2">✕</button></div>}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Flag size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400">No flagged events — all clear!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Flag Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {events.map(ev => (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{ev.user_name}</p>
                        <p className="text-xs text-gray-500">{ev.department_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{format(new Date(ev.event_timestamp), 'd MMM yyyy HH:mm')}</td>
                      <td className="px-4 py-3">
                        {ev.flag_reason?.split(',').map(r => (
                          <Badge key={r} variant={r === 'LATE_ARRIVAL' ? 'warning' : 'danger'}>{r.replace('_', ' ')}</Badge>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {ev.latitude != null
                          ? <a href={`https://maps.google.com/?q=${ev.latitude},${ev.longitude}`} target="_blank" rel="noopener"
                              className="flex items-center gap-1 text-blue-600 hover:underline">
                              <MapPin size={12} /> {Number(ev.latitude).toFixed(4)}, {Number(ev.longitude).toFixed(4)}
                            </a>
                          : 'No location'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setUnflagModal(ev); setAddLocation(false); setLocationName(''); setRadius(200); }}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                          Review & Unflag
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40">Previous</button>
            <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {unflagModal && (
        <Modal title="Review Flagged Event" onClose={() => setUnflagModal(null)}>
          <form onSubmit={handleUnflag} className="space-y-5">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Employee</span><span className="font-medium">{unflagModal.user_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span><span>{format(new Date(unflagModal.event_timestamp), 'd MMM yyyy HH:mm')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Flag</span>
                <span>{unflagModal.flag_reason?.split(',').map(r => (
                  <Badge key={r} variant={r === 'LATE_ARRIVAL' ? 'warning' : 'danger'}>{r.replace('_', ' ')}</Badge>
                ))}</span>
              </div>
              {unflagModal.latitude != null && (
                <div className="flex justify-between"><span className="text-gray-500">Location</span>
                  <a href={`https://maps.google.com/?q=${unflagModal.latitude},${unflagModal.longitude}`} target="_blank" rel="noopener"
                    className="text-blue-600 hover:underline text-xs">
                    View on Map
                  </a>
                </div>
              )}
            </div>

            {unflagModal.latitude != null && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="addLoc" checked={addLocation} onChange={e => setAddLocation(e.target.checked)} className="rounded" />
                  <label htmlFor="addLoc" className="text-sm text-gray-700">Add this location to the acceptable locations list</label>
                </div>
                {addLocation && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                      <input value={locationName} onChange={e => setLocationName(e.target.value)} required={addLocation}
                        placeholder="e.g. Client Site - Main Street"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Acceptable Radius (metres)</label>
                      <input type="number" value={radius} onChange={e => setRadius(Number(e.target.value))} min={50} max={5000}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Confirm Unflag
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function HRFlagsPage() {
  return (
    <Layout>
      <HRFlagsContent />
    </Layout>
  );
}
