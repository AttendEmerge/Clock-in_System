import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { resetPassword } from '../../services/api';
import BrandLogo from '../../components/BrandLogo';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const hasRequiredParams = !!email && !!token;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!hasRequiredParams) {
      setError('This reset link is missing required information. Please request a new one.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, token, newPassword);
      setSuccess('Your password has been reset. You can now log in with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo variant="auth" className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-[#d4eef1] mt-1">
            Choose a new password for your account.
          </p>
        </div>

        <div className="bg-white/95 dark:bg-app-surface/95 backdrop-blur rounded-2xl shadow-2xl border border-white/50 dark:border-white/10 p-8">
          {!hasRequiredParams && (
            <div className="space-y-4 text-sm text-app">
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                This reset link is missing required information or is malformed. Please request a
                new password reset from the login page.
              </div>
            </div>
          )}

          {hasRequiredParams && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-app mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-app-input-border rounded-lg bg-app-input focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent text-sm"
                  placeholder="Enter a new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-app-input-border rounded-lg bg-app-input focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent text-sm"
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm"
              >
                {loading ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[#d4eef1] text-sm mt-6 flex items-center justify-center gap-2">
          <ArrowLeft size={14} />
          <Link to="/login" className="underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

