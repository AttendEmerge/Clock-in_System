import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../../components/Layout';
import StatCard from '../../components/StatCard';
import { getHRDashboard } from '../../services/api';
import type { HRDashboard as DashboardType } from '../../types';
import {
  Users, UserCheck, UserX, Clock, Flag, AlertCircle,
  ArrowRight, CalendarDays, KeyRound, UserPlus, MapPin,
  FileBarChart, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface ActionItem {
  label: string;
  count: number;
  href: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

export default function HRDashboard() {
  const [data, setData] = useState<DashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchDashboard(); }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const d = await getHRDashboard();
      setData(d);
    } catch {}
    setLoading(false);
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  const weeklyData = (data?.weekly_attendance || []).map((d: any) => ({
    day: format(new Date(d.day), 'EEE d'),
    present: d.count,
  }));

  const deptData = (data?.department_stats || []).map((d: any) => ({
    name: d.department || 'Unknown',
    present: d.present,
    absent: d.total - d.present,
  }));

  const actionItems: ActionItem[] = [
    {
      label: 'Token Requests',
      count: data?.pending_token_requests || 0,
      href: '/hr/attendance?tab=tokens',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
      icon: <KeyRound size={18} className="text-amber-600" />,
    },
    {
      label: 'Overtime Requests',
      count: data?.pending_overtime || 0,
      href: '/hr/overtime',
      color: 'text-purple-700',
      bgColor: 'bg-purple-50 border-purple-200',
      icon: <AlertCircle size={18} className="text-purple-600" />,
    },
    {
      label: 'Leave Requests',
      count: data?.pending_leave || 0,
      href: '/hr/leave',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
      icon: <CalendarDays size={18} className="text-blue-600" />,
    },
    {
      label: 'Flagged Events',
      count: data?.flagged_count || 0,
      href: '/hr/attendance?tab=flags',
      color: 'text-red-700',
      bgColor: 'bg-red-50 border-red-200',
      icon: <Flag size={18} className="text-red-600" />,
    },
  ];

  const pendingItems = actionItems.filter(a => a.count > 0);

  const quickActions: QuickAction[] = [
    { label: 'Add Employee', href: '/hr/workforce', icon: <UserPlus size={18} />, description: 'Register a new employee' },
    { label: 'Manage Locations', href: '/hr/attendance?tab=locations', icon: <MapPin size={18} />, description: 'Add or edit clock-in locations' },
    { label: 'Leave Policy', href: '/hr/leave?tab=policy', icon: <CalendarDays size={18} />, description: 'Configure leave types and days' },
    { label: 'View Reports', href: '/hr/reports', icon: <FileBarChart size={18} />, description: 'Attendance, leave, and overtime' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Company-wide attendance overview</p>
        </div>

        {/* Action Items — only shown when there are pending items */}
        {pendingItems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              Action Items
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {pendingItems.map(item => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.href)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:shadow-sm group ${item.bgColor}`}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${item.color}`}>
                      {item.count} pending
                    </p>
                    <p className="text-xs text-gray-500 truncate">{item.label}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Employees" value={data?.total_employees || 0} icon={<Users size={20} />} color="blue" />
          <StatCard label="Present Today" value={data?.present_today || 0} sub={`${data?.total_employees ? Math.round(((data.present_today) / data.total_employees) * 100) : 0}% attendance`} icon={<UserCheck size={20} />} color="green" />
          <StatCard label="Absent Today" value={data?.absent_today || 0} icon={<UserX size={20} />} color="yellow" />
          <StatCard label="Late Today" value={data?.late_today || 0} icon={<Clock size={20} />} color="red" />
          <StatCard label="Flagged Events" value={data?.flagged_count || 0} sub="Needs review" icon={<Flag size={20} />} color="red" />
          <StatCard label="Pending OT" value={data?.pending_overtime || 0} sub="Awaiting HR action" icon={<AlertCircle size={20} />} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Attendance Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Weekly Attendance (Last 7 Days)</h2>
            {weeklyData.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="present" fill="#4C808A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Department Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Department Attendance</h2>
            {deptData.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No departments configured</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="present" fill="#3B4167" name="Present" radius={[0, 4, 4, 0]} stackId="a" />
                  <Bar dataKey="absent" fill="#e5e7eb" name="Absent" radius={[0, 4, 4, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.href)}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 text-left hover:bg-gray-50 hover:border-gray-200 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors flex-shrink-0">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                  <p className="text-xs text-gray-400 truncate">{action.description}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
