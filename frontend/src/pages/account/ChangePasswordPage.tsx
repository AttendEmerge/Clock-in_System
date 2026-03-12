import { FormEvent, useState } from 'react';
import Layout from '../../components/Layout';
import { changePassword } from '../../services/api';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Change Password</h1>
        <p className="text-sm text-gray-600 mb-6">
          Update your account password. After changing your password, you may be signed out on
          other devices.
        </p>

        <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoComplete="new-password"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Use at least 8 characters. Avoid reusing passwords from other systems.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {loading ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

