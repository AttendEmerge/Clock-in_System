import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { getWorkSchedule, updateWorkSchedule } from '../../services/api';
import type { WorkSchedule } from '../../types';
import { Clock, CheckCircle2 } from 'lucide-react';

export function HRScheduleContent() {
  const [_schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [form, setForm] = useState({ expected_start: '08:00', expected_end: '17:00', late_grace_minutes: 15, overtime_buffer_minutes: 5 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetchSchedule(); }, []);

  async function fetchSchedule() {
    setLoading(true);
    try {
      const data = await getWorkSchedule();
      if (data) {
        setSchedule(data);
        setForm({
          expected_start: data.expected_start?.slice(0, 5) || '08:00',
          expected_end: data.expected_end?.slice(0, 5) || '17:00',
          late_grace_minutes: data.late_grace_minutes,
          overtime_buffer_minutes: data.overtime_buffer_minutes,
        });
      }
    } catch {}
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateWorkSchedule(form);
      setMsg('Work schedule updated successfully.');
      fetchSchedule();
    } catch {}
    setSaving(false);
  }

  return (
    <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-app">Work Schedule</h1>
          <p className="text-app-muted text-sm mt-1">Configure expected hours and grace periods (Mon–Fri)</p>
        </div>

        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> {msg}
            <button onClick={() => setMsg('')} className="ml-auto">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-app mb-1">
                  <span className="flex items-center gap-1"><Clock size={14} /> Expected Start Time</span>
                </label>
                <input type="time" value={form.expected_start} onChange={e => setForm({ ...form, expected_start: e.target.value })} required
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-app mb-1">
                  <span className="flex items-center gap-1"><Clock size={14} /> Expected End Time</span>
                </label>
                <input type="time" value={form.expected_end} onChange={e => setForm({ ...form, expected_end: e.target.value })} required
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1">Late Arrival Grace Period (minutes)</label>
              <input type="number" value={form.late_grace_minutes} onChange={e => setForm({ ...form, late_grace_minutes: parseInt(e.target.value) })}
                min={0} max={120} required
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              <p className="text-xs text-app-subtle mt-1">
                Employees clocking in after {form.expected_start} + {form.late_grace_minutes} min will be flagged as late
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1">Auto Checkout Buffer (minutes after end time)</label>
              <input type="number" value={form.overtime_buffer_minutes} onChange={e => setForm({ ...form, overtime_buffer_minutes: parseInt(e.target.value) })}
                min={0} max={60} required
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              <p className="text-xs text-app-subtle mt-1">
                Employees without overtime token are auto-checked out {form.overtime_buffer_minutes} minutes after end time
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 space-y-1">
              <p><strong>Current Schedule:</strong></p>
              <p>Work Hours: {form.expected_start} — {form.expected_end} (Mon–Fri)</p>
              <p>Late after: {form.expected_start} + {form.late_grace_minutes} min grace period</p>
              <p>Auto checkout: {form.overtime_buffer_minutes} min after {form.expected_end}</p>
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-app-accent hover:bg-app-accent-hover disabled:bg-blue-400 text-white py-2.5 rounded-lg text-sm font-medium">
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </form>
        )}
      </div>
  );
}

export default function HRSchedulePage() {
  return (
    <Layout>
      <HRScheduleContent />
    </Layout>
  );
}
