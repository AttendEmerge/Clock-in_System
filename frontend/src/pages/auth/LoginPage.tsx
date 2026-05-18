import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login as apiLogin } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../../components/BrandLogo';

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
          <BrandLogo variant="auth" className="mx-auto mb-4" />
          <p className="text-[#d4eef1] mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 dark:bg-app-surface/95 backdrop-blur rounded-2xl shadow-2xl border border-white/50 dark:border-white/10 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-app mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 border border-app-input-border rounded-lg bg-app-input focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 border border-app-input-border rounded-lg bg-app-input focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-app-subtle hover:text-app-muted"
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
                className="w-4 h-4 text-app-accent border-app-input-border rounded focus:ring-app-accent cursor-pointer"
              />
              <label htmlFor="remember_me" className="text-sm text-app-muted cursor-pointer select-none">
                Keep me signed in for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm"
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
