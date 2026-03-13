import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getHRLeaveRequests, getDepartments, getLeaveReportUrl,
  getAttendanceReportPreview, getOvertimeReportPreview,
  getAttendanceReportUrl, getOvertimeReportUrl, getAuthToken,
} from '../../services/api';
import type { Department } from '../../types';
import { format } from 'date-fns';
import { Download, Search } from 'lucide-react';

type Tab = 'attendance' | 'leave' | 'overtime';

const LEAVE_LABELS: Record<string, string> = {
  paid: 'Paid', sick: 'Sick', maternity: 'Maternity', paternity: 'Paternity',
};
const ALL_STATUSES = ['pending','approved','denied','active','completed','early_return'];
const MONTHS = [
  '', 'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function triggerDownload(url: string, filename: string) {
  const token = getAuthToken();
  const fullUrl = token ? `${url}${url.includes('?') ? '&' : '?'}_token=${token}` : url;
  const a = document.createElement('a');
  a.href = fullUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const fmtDate = (d: string) => { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; } };

export default function HRSystemReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(
    initialTab === 'leave' || initialTab === 'overtime' || initialTab === 'attendance' ? initialTab : 'attendance'
  );
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => { getDepartments().then(setDepartments).catch(() => {}); }, []);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (nextTab === 'leave' || nextTab === 'overtime' || nextTab === 'attendance') {
      setTab(nextTab);
      return;
    }
    if (!nextTab) setTab('attendance');
  }, [searchParams]);

  function changeTab(nextTab: Tab) {
    const next = new URLSearchParams(searchParams);
    if (nextTab === 'attendance') next.delete('tab');
    else next.set('tab', nextTab);
    setSearchParams(next, { replace: true });
    setTab(nextTab);
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Filter, preview and export company data</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(['attendance', 'leave', 'overtime'] as Tab[]).map(t => (
            <button key={t} onClick={() => changeTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'attendance' && <AttendanceReport departments={departments} />}
        {tab === 'leave'      && <LeaveReport      departments={departments} />}
        {tab === 'overtime'   && <OvertimeReport   departments={departments} />}
      </div>
    </Layout>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────

function AttendanceReport({ departments }: { departments: Department[] }) {
  const now = new Date();
  const [filters, setFilters] = useState({ year: String(now.getFullYear()), month: String(now.getMonth() + 1), department_id: '' });
  const [rows,    setRows]    = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const p: Record<string,string> = {};
      if (filters.year)          p.year          = filters.year;
      if (filters.month)         p.month         = filters.month;
      if (filters.department_id) p.department_id = filters.department_id;
      const data = await getAttendanceReportPreview(p);
      setRows(data);
    } catch {}
    setLoading(false);
  }

  function download() {
    const p: Record<string,string> = {};
    if (filters.year)          p.year          = filters.year;
    if (filters.month)         p.month         = filters.month;
    if (filters.department_id) p.department_id = filters.department_id;
    triggerDownload(getAttendanceReportUrl(p), `attendance_${filters.year}_${filters.month || 'all'}.csv`);
  }

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters} onChange={f => setFilters({ ...filters, ...f })}
        departments={departments} showMonth
        onSearch={search} onDownload={download} count={rows.length} loading={loading}
      />
      <PreviewTable
        loading={loading}
        headers={['Employee','Department','Gender','Days Present','Days Absent','Late Arrivals','Attendance %','Working Days']}
        rows={rows.map(r => [
          r.name, r.department, r.gender,
          r.days_present, r.days_absent, r.late_arrivals,
          `${r.attendance_rate}%`, r.total_working_days,
        ] as (string | number | null)[])}
      />
    </div>
  );
}

// ─── Leave Tab ────────────────────────────────────────────────────────────────

function LeaveReport({ departments }: { departments: Department[] }) {
  const [filters, setFilters] = useState({ year: String(new Date().getFullYear()), department_id: '', leave_type: '', status: '' });
  const [rows,    setRows]    = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const p: Record<string,string> = {};
      if (filters.year)          p.year          = filters.year;
      if (filters.department_id) p.department_id = filters.department_id;
      if (filters.leave_type)    p.leave_type    = filters.leave_type;
      if (filters.status)        p.status        = filters.status;
      const data = await getHRLeaveRequests(p);
      setRows(data);
    } catch {}
    setLoading(false);
  }

  function download() {
    const p: Record<string,string> = {};
    if (filters.year)          p.year          = filters.year;
    if (filters.department_id) p.department_id = filters.department_id;
    if (filters.leave_type)    p.leave_type    = filters.leave_type;
    if (filters.status)        p.status        = filters.status;
    triggerDownload(getLeaveReportUrl(p), `leave_report_${filters.year}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
            <input type="number" value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })}
              min={2020} max={2099}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select value={filters.department_id} onChange={e => setFilters({ ...filters, department_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
              <option value="">All</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Leave Type</label>
            <select value={filters.leave_type} onChange={e => setFilters({ ...filters, leave_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
              <option value="">All</option>
              {Object.entries(LEAVE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
              <option value="">All</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={search}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Search size={15} /> Preview
          </button>
          <button onClick={download} disabled={rows.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Download size={15} /> Download CSV
          </button>
          <span className="flex items-center text-sm text-gray-500 ml-auto">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <PreviewTable
        loading={loading}
        headers={['Employee','Department','Gender','Leave Type','Start','End','Days','Status','Early Return','HR Note','Submitted']}
        rows={(rows as Record<string, unknown>[]).map(r => [
          r.employee_name, r.department_name || '—', r.gender,
          LEAVE_LABELS[r.leave_type as string] || r.leave_type,
          fmtDate(r.start_date as string), fmtDate(r.end_date as string), r.days_requested,
          String(r.status).replace('_',' '),
          r.actual_return_date ? `Yes (${fmtDate(r.actual_return_date as string)})` : 'No',
          r.hr_note || '—', fmtDate(r.created_at as string),
        ] as (string | number | null)[])}
      />
    </div>
  );
}

// ─── Overtime Tab ─────────────────────────────────────────────────────────────

function OvertimeReport({ departments }: { departments: Department[] }) {
  const [filters, setFilters] = useState({ year: String(new Date().getFullYear()), department_id: '' });
  const [rows,    setRows]    = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const p: Record<string,string> = {};
      if (filters.year)          p.year          = filters.year;
      if (filters.department_id) p.department_id = filters.department_id;
      const data = await getOvertimeReportPreview(p);
      setRows(data);
    } catch {}
    setLoading(false);
  }

  function download() {
    const p: Record<string,string> = {};
    if (filters.year)          p.year          = filters.year;
    if (filters.department_id) p.department_id = filters.department_id;
    triggerDownload(getOvertimeReportUrl(p), `overtime_report_${filters.year}.csv`);
  }

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters} onChange={f => setFilters({ ...filters, ...f })}
        departments={departments} showMonth={false}
        onSearch={search} onDownload={download} count={rows.length} loading={loading}
      />
      <PreviewTable
        loading={loading}
        headers={['Employee','Department','Total Requests','Regular OT','Double OT','Pending','Supervisor Approved','HR Approved','Rejected']}
        rows={rows.map(r => [
          r.employee_name, r.department || '—',
          r.total_requests, r.regular_requests ?? 0, r.double_requests ?? 0,
          r.pending, r.supervisor_approved, r.hr_approved, r.rejected,
        ] as (string | number | null)[])}
      />
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function FilterBar({ filters, onChange, departments, showMonth, onSearch, onDownload, count, loading }: {
  filters: Record<string, string>;
  onChange: (f: Record<string, string>) => void;
  departments: Department[];
  showMonth: boolean;
  onSearch: () => void;
  onDownload: () => void;
  count: number;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
          <input type="number" value={filters.year || ''} onChange={e => onChange({ year: e.target.value })}
            min={2020} max={2099}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {showMonth && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <select value={filters.month || ''} onChange={e => onChange({ month: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
              <option value="">All Months</option>
              {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
          <select value={filters.department_id || ''} onChange={e => onChange({ department_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={onSearch} disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Search size={15} /> {loading ? 'Loading…' : 'Preview'}
        </button>
        <button onClick={onDownload} disabled={count === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Download size={15} /> Download CSV
        </button>
        <span className="flex items-center text-sm text-gray-500 ml-auto">{count} record{count !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

function PreviewTable({ headers, rows, loading }: {
  headers: string[];
  rows: (string | number | null)[][];
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">Click Preview to load data.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {headers.map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{cell ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
