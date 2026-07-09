import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail, Loader2 } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const Auth: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#07080e] overflow-hidden px-4">
      {/* Background neon glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Auth Card Container */}
      <div className="w-full max-w-md z-10">
        <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-2xl relative">
          
          {/* Logo Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-2 bg-white/5 rounded-2xl border border-white/5 mb-4">
              <img src={logoImg} alt="WFX Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              WFX AI-ERP
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              {isLogin ? 'Sign in to access apparel sourcing intelligence' : 'Create an account to start exploring your data'}
            </p>
          </div>

          {/* Form Error Notice */}
          {error && (
            <div className="mb-6 p-4 bg-red-950/30 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#0d0e16] border border-white/5 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/40 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#0d0e16] border border-white/5 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/40 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-purple-900/10 flex items-center justify-center gap-2 border border-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Form Switcher */}
          <div className="text-center mt-6 text-sm text-slate-400">
            {isLogin ? (
              <span>
                New to WFX ERP?{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(null); }}
                  className="text-purple-400 hover:text-purple-300 font-medium underline underline-offset-4"
                >
                  Create an account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(null); }}
                  className="text-purple-400 hover:text-purple-300 font-medium underline underline-offset-4"
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
