import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail, Loader2, AlertCircle, CheckCircle2, UserX, ShieldAlert } from 'lucide-react';
import logoImg from '../assets/logo.png';

// Alert types for different scenarios
type AlertType = 'error' | 'success' | 'warning';

interface AlertState {
  type: AlertType;
  message: string;
  subMessage?: string;
  actionLabel?: string;
  actionFn?: () => void;
}

export const Auth: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [loading, setLoading] = useState(false);

  const clearAlert = () => setAlert(null);

  const switchToRegister = () => {
    setIsLogin(false);
    clearAlert();
  };

  const switchToLogin = () => {
    setIsLogin(true);
    clearAlert();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setAlert({ type: 'error', message: 'Please fill in all fields.' });
      return;
    }

    if (password.length < 6) {
      setAlert({ type: 'warning', message: 'Password must be at least 6 characters.' });
      return;
    }

    clearAlert();
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN ---
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.status === 404) {
          // User does not exist
          setAlert({
            type: 'error',
            message: 'No account found with this email address.',
            subMessage: 'It looks like you haven\'t registered yet.',
            actionLabel: '→ Create a new account',
            actionFn: switchToRegister
          });
          return;
        }

        if (response.status === 401) {
          // Wrong password
          setAlert({
            type: 'error',
            message: 'Incorrect password.',
            subMessage: 'Please double-check your password. It is case-sensitive.'
          });
          return;
        }

        if (!response.ok) {
          setAlert({ type: 'error', message: data.error || 'Login failed. Please try again.' });
          return;
        }

        // Success — delegate to context to set token/user
        await login(email, password);

      } else {
        // --- REGISTER ---
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.status === 400 && data.error?.toLowerCase().includes('already exists')) {
          setAlert({
            type: 'warning',
            message: 'An account with this email already exists.',
            subMessage: 'Please sign in instead.',
            actionLabel: '→ Go to Sign In',
            actionFn: switchToLogin
          });
          return;
        }

        if (!response.ok) {
          setAlert({ type: 'error', message: data.error || 'Registration failed. Please try again.' });
          return;
        }

        // Successful registration — auto login
        await register(email, password);
        setAlert({
          type: 'success',
          message: 'Account created successfully!',
          subMessage: 'You are now signed in to WFX ERP.'
        });
      }

    } catch (err: any) {
      setAlert({ type: 'error', message: 'Unable to connect to server. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  // Alert color + icon config
  const alertConfig = {
    error: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/20',
      text: 'text-red-700 dark:text-red-400',
      subText: 'text-red-500 dark:text-red-500',
      Icon: AlertCircle
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      subText: 'text-amber-500 dark:text-amber-500',
      Icon: ShieldAlert
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-500/10',
      border: 'border-green-200 dark:border-green-500/20',
      text: 'text-green-700 dark:text-green-400',
      subText: 'text-green-500 dark:text-green-500',
      Icon: CheckCircle2
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 transition-colors duration-200">

      {/* Auth Card Container */}
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-lg shadow-sm relative">

          {/* Logo Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 mb-4">
              <img src={logoImg} alt="WFX Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              WFX ERP Platform
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              {isLogin ? 'Sign in to access apparel sourcing intelligence' : 'Create an account to start exploring your data'}
            </p>
          </div>

          {/* ===== ALERT BANNER ===== */}
          {alert && (() => {
            const cfg = alertConfig[alert.type];
            const Icon = cfg.Icon;
            return (
              <div className={`mb-5 p-4 ${cfg.bg} border ${cfg.border} rounded-lg animate-fade-in`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.text}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${cfg.text}`}>{alert.message}</p>
                    {alert.subMessage && (
                      <p className={`text-xs mt-1 ${cfg.subText}`}>{alert.subMessage}</p>
                    )}
                    {alert.actionLabel && alert.actionFn && (
                      <button
                        type="button"
                        onClick={alert.actionFn}
                        className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-500 font-semibold text-xs hover:underline transition"
                      >
                        {alert.actionLabel}
                      </button>
                    )}
                  </div>
                  {/* Dismiss button */}
                  <button
                    type="button"
                    onClick={clearAlert}
                    className={`text-xs ${cfg.text} opacity-50 hover:opacity-100 transition flex-shrink-0 font-bold`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearAlert(); }}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearAlert(); }}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 border border-blue-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Form Switcher */}
          <div className="text-center mt-6 text-xs text-slate-500">
            {isLogin ? (
              <span>
                New to WFX ERP?{' '}
                <button
                  type="button"
                  onClick={switchToRegister}
                  className="text-blue-600 dark:text-blue-500 hover:underline font-semibold"
                >
                  Create an account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="text-blue-600 dark:text-blue-500 hover:underline font-semibold"
                >
                  Sign in here
                </button>
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
