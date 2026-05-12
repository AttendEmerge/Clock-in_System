import type { FormEvent } from 'react';
import { useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { changePassword } from '../../services/api';
import { Sun, Moon } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwSuccess('Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const ex = err as { response?: { data?: { error?: string } } };
      setPwError(ex.response?.data?.error || 'Failed to change password. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  const cardClass =
    'bg-app-surface shadow-sm rounded-xl border border-app-border p-6';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-app">Profile</h1>
          <p className="text-sm text-app-muted mt-1">Account settings and appearance</p>
        </div>

        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-app mb-4">Account</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-app-subtle">Name</dt>
              <dd className="text-app font-medium">{user?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-app-subtle">Email</dt>
              <dd className="text-app font-medium">{user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-app-subtle">Role</dt>
              <dd className="text-app font-medium capitalize">{user?.role ?? '—'}</dd>
            </div>
            {user?.department_name != null && user.department_name !== '' && (
              <div>
                <dt className="text-app-subtle">Department</dt>
                <dd className="text-app font-medium">{user.department_name}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-app mb-1">Appearance</h2>
          <p className="text-sm text-app-muted mb-4">Choose how the app looks on this device.</p>
          <div className="flex rounded-lg border border-app-border p-1 bg-app-page gap-1">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-colors
                ${theme === 'light'
                  ? 'bg-app-surface text-app shadow-sm border border-app-border'
                  : 'text-app-muted hover:text-app'
                }`}
            >
              <Sun size={18} />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-colors
                ${theme === 'dark'
                  ? 'bg-app-surface text-app shadow-sm border border-app-border'
                  : 'text-app-muted hover:text-app'
                }`}
            >
              <Moon size={18} />
              Dark
            </button>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-app mb-1">Security</h2>
          <p className="text-sm text-app-muted mb-6">
            Update your password. You may be signed out on other devices after changing it.
          </p>

          {pwError && (
            <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="mb-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
              {pwSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-app mb-1.5">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-app-input-border rounded-lg bg-app-input text-app focus:outline-none focus:ring-2 focus:ring-app-accent/40 focus:border-app-accent text-sm"
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1.5">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-app-input-border rounded-lg bg-app-input text-app focus:outline-none focus:ring-2 focus:ring-app-accent/40 focus:border-app-accent text-sm"
                autoComplete="new-password"
                required
              />
              <p className="mt-1 text-xs text-app-subtle">
                Use at least 8 characters. Avoid reusing passwords from other systems.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-app-input-border rounded-lg bg-app-input text-app focus:outline-none focus:ring-2 focus:ring-app-accent/40 focus:border-app-accent text-sm"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 transition-colors"
            >
              {pwLoading ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
