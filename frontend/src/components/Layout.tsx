import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Clock, Users,
  LogOut, Menu, X, UserCheck,
  ClipboardList, CalendarDays, BarChart2,
  AlertTriangle, Lock,
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
      { label: 'My Clock-in', href: '/employee/dashboard', icon: <Clock size={18} /> },
    ];
  }
  return [
    { label: 'Dashboard',         href: '/employee/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'My Leave',          href: '/employee/leave',     icon: <CalendarDays size={18} /> },
    { label: 'Clock History',     href: '/employee/history',   icon: <Clock size={18} /> },
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

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login');
  };

  const roleBadgeColor = {
    hr: 'bg-purple-100 text-purple-700',
    supervisor: 'bg-blue-100 text-blue-700',
    employee: 'bg-green-100 text-green-700',
  }[user?.role || 'employee'];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Clock size={18} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">ClockIn</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
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
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Account + Logout */}
          <div className="px-3 py-4 border-t border-gray-100 space-y-2">
            <Link
              to="/account/change-password"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Lock size={18} />
              Change Password
            </Link>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1 lg:flex-none" />
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 w-full max-w-sm mx-4 animate-in fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Sign out?</h3>
                <p className="text-sm text-gray-500">You will need to log in again to access the system.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
