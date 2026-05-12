import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../../services/api';
import { Plus, Pencil, Trash2, CalendarHeart } from 'lucide-react';

interface Holiday {
  id: number;
  date: string;
  name: string;
  description: string | null;
}

export function HRHolidaysContent() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState('');
  const [error, setError]       = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState({ date: '', name: '', description: '' });

  useEffect(() => { fetchHolidays(); }, [yearFilter]);

  async function fetchHolidays() {
    setLoading(true);
    try {
      const data = await getHolidays({ year: yearFilter });
      setHolidays(data);
    } catch {}
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ date: '', name: '', description: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(h: Holiday) {
    setEditId(h.id);
    const dateStr = typeof h.date === 'string' && h.date.length >= 10 ? h.date.slice(0, 10) : h.date;
    setForm({ date: dateStr, name: h.name, description: h.description || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        await updateHoliday(editId, form);
        setMsg('Holiday updated.');
      } else {
        await createHoliday(form);
        setMsg('Holiday created.');
      }
      setShowModal(false);
      fetchHolidays();
    } catch (err: unknown) {
      const ex = err as { response?: { data?: { error?: string } } };
      setError(ex.response?.data?.error || 'Failed to save holiday.');
    }
  }

  async function handleDelete(h: Holiday) {
    if (!window.confirm(`Delete holiday "${h.name}" on ${formatDate(h.date)}?`)) return;
    try {
      await deleteHoliday(h.id);
      setMsg('Holiday deleted.');
      fetchHolidays();
    } catch {
      setError('Failed to delete holiday.');
    }
  }

  function formatDate(d: string) {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-app">Holiday Calendar</h1>
            <p className="text-sm text-app-muted mt-0.5">
              Set company holidays. Employees will not be flagged as absent on these dates and regular clock-in will be disabled.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={yearFilter}
              onChange={e => setYearFilter(Number(e.target.value))}
              className="px-3 py-2 border border-app-input-border rounded-lg text-sm"
            >
              {[yearFilter - 1, yearFilter, yearFilter + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-app-accent hover:bg-app-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus size={16} /> Add Holiday
            </button>
          </div>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg} <button onClick={() => setMsg('')} className="ml-2 font-bold">x</button></div>}
        {error && !showModal && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error} <button onClick={() => setError('')} className="ml-2 font-bold">x</button></div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="bg-app-surface rounded-xl border border-app-border-subtle p-12 text-center">
            <CalendarHeart size={40} className="mx-auto text-app-subtle mb-3" />
            <p className="text-app-subtle text-sm">No holidays set for {yearFilter}.</p>
          </div>
        ) : (
          <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-app-page border-b border-app-border-subtle">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Holiday</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border-subtle">
                {holidays.map(h => {
                  const dateStr = typeof h.date === 'string' ? h.date.slice(0, 10) : h.date;
                  const isPast = dateStr < today;
                  return (
                    <tr key={h.id} className={`hover:bg-app-page ${isPast ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-app whitespace-nowrap">{formatDate(h.date)}</td>
                      <td className="px-4 py-3 font-medium text-app">{h.name}</td>
                      <td className="px-4 py-3 text-app-muted">{h.description || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(h)} title="Edit"
                            className="p-1.5 text-app-subtle hover:text-app-accent hover:bg-blue-50 rounded">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(h)} title="Delete"
                            className="p-1.5 text-app-subtle hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editId ? 'Edit Holiday' : 'Add Holiday'} onClose={() => setShowModal(false)} size="sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-app mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Christmas Day, Workers' Day..."
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Description <span className="text-app-subtle">(optional)</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-app-accent hover:bg-app-accent-hover text-white py-2.5 rounded-lg text-sm font-medium"
            >
              {editId ? 'Save Changes' : 'Create Holiday'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function HRHolidaysPage() {
  return (
    <Layout>
      <HRHolidaysContent />
    </Layout>
  );
}
