import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(
        e.response?.data?.error ||
          'Something went wrong while requesting a password reset. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/12 border border-white/15 rounded-2xl backdrop-blur-sm mb-4 shadow-lg shadow-black/10">
            <Mail size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Forgot Password</h1>
          <p className="text-[#d4eef1] mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="bg-white/96 backdrop-blur rounded-2xl shadow-2xl border border-white/50 p-8">
          {submitted ? (
            <div className="space-y-4 text-sm text-gray-700">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                If an account with that email exists, we&apos;ve sent password reset
                instructions. Please check your inbox (and spam folder).
              </div>
              <p>
                You can close this page after you&apos;ve finished resetting your password
                from the email link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:opacity-70 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm"
              >
                {loading ? 'Sending reset link...' : 'Send reset link'}
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

