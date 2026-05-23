import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getEmailByUsername } from '../lib/userService';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let loginEmail = email.trim();

      // Si escribieron admin, forzamos el correo de admin
      if (loginEmail.toLowerCase() === 'admin') {
        loginEmail = 'fotoesportmerch@gmail.com';
      }
      // Si no contiene '@' asumimos que es un nombre de usuario
      else if (!loginEmail.includes('@')) {
        const foundEmail = await getEmailByUsername(loginEmail);
        if (!foundEmail) {
          throw new Error('El nombre de usuario no existe');
        }
        loginEmail = foundEmail;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (signInError) throw signInError;

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (oAuthError) throw oAuthError;
    } catch (err: any) {
      setError(err.message || 'Error con Google Sign-In');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-brand-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Shield className="w-8 h-8 text-brand-500" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Sooner <span className="text-brand-500 font-light">Platform</span>
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Inicia sesión para gestionar tu club
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/50 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 backdrop-blur-md border border-slate-800">

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleEmailLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Correo electrónico o Usuario
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-700 rounded-lg shadow-sm bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                  placeholder="ejemplo@som-esport.com o admin"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-700 rounded-lg shadow-sm bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-brand-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-slate-400">O continúa con</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-700 rounded-lg shadow-sm bg-slate-800/50 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
            </div>

            {/* Accesos de Prueba (Solo visibles en entorno de desarrollo local - Vite los eliminará por completo en producción) */}
            {import.meta.env.DEV && (
              <div className="mt-8 border-t border-slate-700/50 pt-6">
                <h3 className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-center mb-4">
                  Accesos de Prueba (Solo Desarrollo)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setEmail('admin'); setPassword('071288Merch'); }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-700 transition-colors"
                  >
                    Rellenar Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('elrubodevlc@gmail.com'); setPassword('071288'); }}
                    className="px-3 py-2 bg-indigo-900/40 hover:bg-indigo-800/60 text-xs text-indigo-300 rounded border border-indigo-800/50 transition-colors"
                  >
                    Rellenar Club
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('mainscrowner@gmail.com'); setPassword('071288'); }}
                    className="px-3 py-2 bg-emerald-900/40 hover:bg-emerald-800/60 text-xs text-emerald-300 rounded border border-emerald-800/50 transition-colors"
                  >
                    Rellenar Menor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('jugador_mayor'); setPassword('071288'); }}
                    className="px-3 py-2 bg-amber-900/40 hover:bg-amber-800/60 text-xs text-amber-300 rounded border border-amber-800/50 transition-colors"
                  >
                    Rellenar Tutor/Mayor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('entrenador_demo'); setPassword('071288'); }}
                    className="px-3 py-2 bg-rose-900/40 hover:bg-rose-800/60 text-xs text-rose-300 rounded border border-rose-800/50 transition-colors"
                  >
                    Rellenar Entrenador
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('directivo_demo'); setPassword('071288'); }}
                    className="px-3 py-2 bg-cyan-900/40 hover:bg-cyan-800/60 text-xs text-cyan-300 rounded border border-cyan-800/50 transition-colors"
                  >
                    Rellenar Directivo
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
