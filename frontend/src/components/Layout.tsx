import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Clock, Users,
  LogOut, Menu, X, UserCheck, User,
  ClipboardList, CalendarDays, BarChart2,
  AlertTriangle,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getNavItems(role: string): NavItem[] {
  if (role === 'hr') {
    return [
      { label: 'Dashboard', href: '/hr/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Workforce', href: '/hr/workforce', icon: <Users size={18} /> },
      { label: 'Attendance', href: '/hr/attendance', icon: <Clock size={18} /> },
      { label: 'Leave', href: '/hr/leave', icon: <CalendarDays size={18} /> },
      { label: 'Overtime', href: '/hr/overtime', icon: <ClipboardList size={18} /> },
      { label: 'Reports', href: '/hr/reports', icon: <BarChart2 size={18} /> },
    ];
  }
  if (role === 'supervisor') {
    return [
      { label: 'Dashboard', href: '/supervisor/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'My Team', href: '/supervisor/team', icon: <Users size={18} /> },
      { label: 'Overtime Requests', href: '/supervisor/overtime', icon: <UserCheck size={18} /> },
      { label: 'My attendance', href: '/employee/dashboard', icon: <Clock size={18} /> },
    ];
  }
  return [
    { label: 'Dashboard',         href: '/employee/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'My Leave',          href: '/employee/leave',     icon: <CalendarDays size={18} /> },
    { label: 'Attendance history', href: '/employee/history',   icon: <Clock size={18} /> },
    { label: 'Overtime Requests', href: '/employee/overtime',  icon: <ClipboardList size={18} /> },
  ];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = getNavItems(user?.role || 'employee');
  const profileActive = location.pathname.startsWith('/account/profile');

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login');
  };

  const roleBadgeColor = {
    hr: 'bg-purple-100 text-purple-700 dark:bg-violet-900/45 dark:text-violet-200',
    supervisor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/45 dark:text-blue-200',
    employee: 'bg-green-100 text-green-700 dark:bg-emerald-900/45 dark:text-emerald-200',
  }[user?.role || 'employee'];

  return (
    <div className="min-h-screen bg-app-page flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-app-surface border-r border-app-border transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-app-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-app-accent rounded-lg flex items-center justify-center">
                <Clock size={18} className="text-white" />
              </div>
              <span className="font-bold text-app text-sm leading-tight">Attendance Tracker</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-app-muted hover:text-app p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b border-app-border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-app-nav-active-bg flex items-center justify-center text-app-nav-active-text font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-app truncate">{user?.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColor}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const active =
                location.pathname === item.href ||
                location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-app-nav-active-bg text-app-nav-active-text'
                      : 'text-app-muted hover:bg-app-border-subtle hover:text-app'
                    }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Profile + Logout */}
          <div className="px-3 py-4 border-t border-app-border-subtle space-y-2">
            <Link
              to="/account/profile"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${profileActive
                  ? 'bg-app-nav-active-bg text-app-nav-active-text'
                  : 'text-app-muted hover:bg-app-border-subtle hover:text-app'
                }`}
            >
              <User size={18} />
              Profile
            </Link>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden dark:bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-app-surface border-b border-app-header-border px-4 py-3 flex items-center justify-between lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-app-muted hover:text-app p-1"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1 lg:flex-none" />
          <div className="text-sm text-app-muted">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto bg-app-page">
          {children}
        </main>
      </div>

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="bg-app-surface rounded-2xl shadow-xl border border-app-border p-6 w-full max-w-sm mx-4 animate-in fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app">Sign out?</h3>
                <p className="text-sm text-app-muted">You will need to log in again to access the system.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-app bg-app-border-subtle hover:opacity-90 rounded-lg transition-colors border border-app-border"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
