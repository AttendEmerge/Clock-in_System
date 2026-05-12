import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Clock, MapPin, LogIn, CheckCircle2, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';

/**
 * Mobile clock-in page — opened on the employee's phone after scanning the QR code.
 * URL: http://[server]/mobile?t=QR_TOKEN
 *
 * GPS notes:
 *  - Modern mobile browsers BLOCK geolocation on non-HTTPS pages (HTTP over LAN IP).
 *  - We detect this and warn the user; clock-in still works but HR will see no coordinates.
 *  - We pre-warm GPS permission as soon as the 'ready' step is shown, so coordinates are
 *    ready the moment the user taps the button (no extra wait).
 */

type Step = 'loading' | 'login' | 'ready' | 'clocking' | 'success' | 'error';
type GpsStatus = 'idle' | 'acquiring' | 'acquired' | 'denied' | 'unsupported' | 'insecure';

interface Coords { latitude: number; longitude: number; accuracy?: number }

export default function MobileClockInPage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const qrToken         = searchParams.get('t');

  const [step,       setStep]      = useState<Step>('loading');
  const [email,      setEmail]     = useState('');
  const [password,   setPassword]  = useState('');
  const [userName,   setUserName]  = useState('');
  const [jwt,        setJwt]       = useState('');
  const [errorMsg,   setErrorMsg]  = useState('');
  const [showOvertimeLink, setShowOvertimeLink] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isFlagged,  setIsFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsCoords, setGpsCoords] = useState<Coords | null>(null);
  const coordsRef = useRef<Coords | null>(null);   // stable ref for use inside callbacks

  // ── On mount: check QR token + validate any existing mobile session ───────
  useEffect(() => {
    if (!qrToken) {
      setStep('error');
      setErrorMsg('Invalid QR code. Please ask HR to generate a new one.');
      return;
    }

    const storedToken = localStorage.getItem('mobile_token');
    const storedUser  = localStorage.getItem('mobile_user');

    if (storedToken && storedUser) {
      let user: { name?: string } | null = null;
      try {
        user = JSON.parse(storedUser);
      } catch {
        // Corrupt data – clear and force login
        localStorage.removeItem('mobile_token');
        localStorage.removeItem('mobile_user');
        setStep('login');
        return;
      }

      // Validate the cached token against /api/auth/me so we don't silently use
      // an expired or invalid JWT and then fail at clock-in time.
      (async () => {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (!res.ok) throw new Error();
          setJwt(storedToken);
          setUserName(user?.name || '');
          setStep('ready');
        } catch {
          localStorage.removeItem('mobile_token');
          localStorage.removeItem('mobile_user');
          setStep('login');
        }
      })();
    } else {
      setStep('login');
    }
  }, [qrToken]);

  // ── Pre-warm GPS when 'ready' step appears ────────────────────────────────
  useEffect(() => {
    if (step !== 'ready') return;
    requestGPS();
  }, [step]);

  function isSecureCtx(): boolean {
    // localhost is always secure; HTTPS pages are secure; everything else is not
    return window.isSecureContext || window.location.hostname === 'localhost';
  }

  async function requestGPS(): Promise<Coords | null> {
    if (!isSecureCtx()) {
      setGpsStatus('insecure');
      return null;
    }
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      return null;
    }
    setGpsStatus('acquiring');
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords: Coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
          coordsRef.current = coords;
          setGpsCoords(coords);
          setGpsStatus('acquired');
          resolve(coords);
        },
        () => {
          setGpsStatus('denied');
          resolve(null);
        },
        { timeout: 15000, enableHighAccuracy: true, maximumAge: 30000 }
      );
    });
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res  = await fetch(`/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      // Store token under a mobile-specific key so it doesn't collide with the main app
      localStorage.setItem('mobile_token', data.token);
      localStorage.setItem('mobile_user',  JSON.stringify(data.user));
      setJwt(data.token);
      setUserName(data.user.name);
      setStep('ready');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Login failed. Check your credentials.');
    }
  }

  // ── Clock In ──────────────────────────────────────────────────────────────
  async function handleClockIn() {
    if (!qrToken) return;
    setStep('clocking');
    setErrorMsg('');
    setShowOvertimeLink(false);

    // Use cached coords if already acquired; otherwise try one more time
    let pos: Coords | null = coordsRef.current;
    if (!pos && gpsStatus !== 'denied' && gpsStatus !== 'insecure' && gpsStatus !== 'unsupported') {
      pos = await requestGPS();
    }

    try {
      const res  = await fetch(`/api/clock/qr`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body:    JSON.stringify({ qr_token: qrToken, latitude: pos?.latitude ?? null, longitude: pos?.longitude ?? null, accuracy: pos?.accuracy ?? null }),
      });
      const data = await res.json();

      // If the backend says our JWT is invalid/expired, clear the mobile
      // session and send the user back to the login step with an explanation.
      if (!res.ok && res.status === 401) {
        localStorage.removeItem('mobile_token');
        localStorage.removeItem('mobile_user');
        setErrorMsg(data.error || 'Your session expired. Please sign in again to clock in.');
        setStep('login');
        return;
      }

      if (!res.ok) {
        setShowOvertimeLink(!!data.regular_clock_in_blocked);
        const err = new Error(data.error || 'Clock-in failed') as Error & { regular_clock_in_blocked?: boolean };
        err.regular_clock_in_blocked = !!data.regular_clock_in_blocked;
        throw err;
      }

      setSuccessMsg(data.message || 'Clocked in successfully!');
      setIsFlagged(!!data.is_flagged);
      setFlagReason(data.flag_reason || '');
      setStep('success');
    } catch (err: unknown) {
      const e = err as Error & { regular_clock_in_blocked?: boolean };
      setStep('error');
      setErrorMsg(e.message || 'Clock-in failed. Please try again.');
    }
  }

  // ── GPS status chip ───────────────────────────────────────────────────────
  function GpsChip() {
    const map: Record<GpsStatus, { icon: React.ReactNode; text: string; cls: string }> = {
      idle:        { icon: <MapPin size={14} />,    text: 'Location pending',     cls: 'bg-app-border-subtle text-app-muted' },
      acquiring:   { icon: <Loader2 size={14} className="animate-spin" />, text: 'Getting location…', cls: 'bg-app-nav-active-bg text-app-accent' },
      acquired:    { icon: <CheckCircle2 size={14} />, text: `Location captured`, cls: 'bg-green-50 text-green-700' },
      denied:      { icon: <AlertCircle size={14} />,  text: 'Location denied — will be flagged', cls: 'bg-orange-50 text-orange-700' },
      unsupported: { icon: <AlertCircle size={14} />,  text: 'Location not available', cls: 'bg-orange-50 text-orange-700' },
      insecure:    { icon: <ShieldAlert size={14} />,  text: 'Location unavailable (HTTP not allowed)',  cls: 'bg-orange-50 text-orange-700' },
    };
    const { icon, text, cls } = map[gpsStatus];
    return (
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${cls}`}>
        {icon} {text}
        {gpsStatus === 'acquired' && gpsCoords && (
          <span className="text-xs font-mono opacity-70 ml-auto">
            {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}
          </span>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return <Shell><Loader2 size={36} className="animate-spin text-app-accent" /></Shell>;
  }

  if (step === 'error') {
    return (
      <Shell>
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <p className="text-red-700 dark:text-red-400 font-semibold text-center">{errorMsg}</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {showOvertimeLink && (
            <a href="/employee/overtime" className="text-app-accent font-semibold underline">
              Request Overtime
            </a>
          )}
          <button onClick={() => navigate('/login')} className="text-app-accent underline text-sm">
            Go to login
          </button>
        </div>
      </Shell>
    );
  }

  if (step === 'success') {
    return (
      <Shell>
        <CheckCircle2 size={56} className="text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-app mb-1">You're clocked in!</h2>
        <p className="text-app-muted text-sm mb-4">{successMsg}</p>
        {isFlagged && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800 text-center mb-3">
            <strong>Note:</strong> This clock-in was flagged ({flagReason?.replace('_', ' ')}) and will be reviewed by HR.
          </div>
        )}
        {(gpsStatus === 'denied' || gpsStatus === 'insecure' || gpsStatus === 'unsupported') && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 text-center">
            {gpsStatus === 'insecure'
              ? 'Your clock-in was recorded without location. This is because the app is running over HTTP — ask IT to enable HTTPS for location support.'
              : 'Location permission was denied — your clock-in was recorded without GPS and will be reviewed by HR.'
            }
          </div>
        )}
        {gpsStatus === 'acquired' && gpsCoords && (
          <p className="text-xs text-app-subtle mt-3">
            Location recorded: {gpsCoords.latitude.toFixed(5)}, {gpsCoords.longitude.toFixed(5)}
          </p>
        )}
        <p className="text-xs text-app-subtle mt-6">You can close this page.</p>
      </Shell>
    );
  }

  if (step === 'clocking') {
    return (
      <Shell>
        <Loader2 size={36} className="animate-spin text-app-accent mb-4" />
        <p className="text-app-muted font-medium">Clocking in…</p>
        <p className="text-app-subtle text-xs mt-2">Please wait.</p>
      </Shell>
    );
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 dark:from-zinc-950 dark:via-violet-950 dark:to-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 dark:bg-white/10 rounded-2xl mb-3">
              <Clock size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Clock In</h1>
            <p className="text-white/80 dark:text-violet-200/90 text-sm mt-1">Sign in to record your attendance</p>
          </div>
          <div className="bg-app-surface rounded-2xl p-6 shadow-xl border border-app-border">
            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm mb-4">{errorMsg}</div>
            )}
            {!isSecureCtx() && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-800 mb-4 flex items-start gap-2">
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span>Location capture requires HTTPS. Your attendance will be recorded but without GPS coordinates. HR will be notified.</span>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                  placeholder="you@company.com"
                  className="w-full px-3 py-3 border border-app-input-border bg-app-input rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-app mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full px-3 py-3 border border-app-input-border bg-app-input rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
              <button type="submit"
                className="w-full bg-app-accent hover:bg-app-accent-hover active:bg-app-accent-hover text-white font-semibold py-3 rounded-xl text-base transition-colors">
                Sign In & Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // step === 'ready'
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 dark:from-zinc-950 dark:via-violet-950 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 dark:bg-white/10 rounded-2xl mb-3">
            <Clock size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Clock In</h1>
          <p className="text-white/80 dark:text-violet-200/90 text-sm mt-1">Welcome, {userName}</p>
        </div>

        <div className="bg-app-surface rounded-2xl p-6 shadow-xl border border-app-border space-y-4">
          {/* GPS status — visible BEFORE the user taps the button */}
          <GpsChip />

          {gpsStatus === 'insecure' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-800 flex items-start gap-2">
              <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                This page is served over HTTP. Mobile browsers block location on non-HTTPS connections.
                Your clock-in will be recorded <strong>without GPS</strong> and HR will review it.
                Ask IT to set up HTTPS for full location support.
              </span>
            </div>
          )}

          {gpsStatus === 'denied' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-800">
              Location was denied. Go to your phone's Settings → Browser → Location and allow access, then reload this page.
              You can still clock in without location.
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">{errorMsg}</div>
          )}

          <button onClick={handleClockIn}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2">
            <LogIn size={22} />
            Clock In Now
          </button>

          <p className="text-center text-xs text-app-subtle">
            Not {userName}?{' '}
            <button
              onClick={() => { localStorage.removeItem('mobile_token'); localStorage.removeItem('mobile_user'); setStep('login'); }}
              className="text-app-accent underline"
            >
              Switch account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app-page flex flex-col items-center justify-center p-6">
      {children}
    </div>
  );
}
