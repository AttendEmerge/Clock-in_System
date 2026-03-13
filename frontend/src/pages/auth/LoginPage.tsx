import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Eye, EyeOff } from 'lucide-react';
import { login as apiLogin } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password, rememberMe);
      login(data.token, data.user, rememberMe);
      if (data.user.role === 'hr')         navigate('/hr/dashboard');
      else if (data.user.role === 'supervisor') navigate('/supervisor/dashboard');
      else                                 navigate('/employee/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%)]" />
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/12 border border-white/15 rounded-2xl backdrop-blur-sm mb-4 shadow-lg shadow-black/10">
            <Clock size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ClockIn System</h1>
          <p className="text-[#d4eef1] mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white/96 backdrop-blur rounded-2xl shadow-2xl border border-white/50 p-8">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Keep me signed in */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="remember_me"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="remember_me" className="text-sm text-gray-600 cursor-pointer select-none">
                Keep me signed in for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:opacity-70 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="text-center text-[#d4eef1] text-sm mt-6 space-y-2">
          <p>
            <Link to="/forgot-password" className="underline">
              Forgot your password?
            </Link>
          </p>
          <p>
            Contact HR if you need access or your account reset by an administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
