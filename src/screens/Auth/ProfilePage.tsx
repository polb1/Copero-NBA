'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Session {
  id: string;
  expiresAt: string;
  createdAt: string;
  ipAddress: string;
  userAgent: string;
}

interface ProfilePageProps {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
  };
  sessions: Array<{
    id: string;
    expiresAt: string;
    createdAt: string;
    ipAddress: string;
    userAgent: string;
  }>;
  onSignOut: () => void;
}

export function ProfilePage({ user, sessions: initialSessions, onSignOut }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'sessions'>('profile');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>({
    resolver: zodResolver(
      z.object({
        currentPassword: z.string().min(1, 'Contraseña actual requerida'),
        newPassword: z.string().min(6, 'Mínimo 6 caracteres').max(50, 'Máximo 50 caracteres'),
        confirmPassword: z.string(),
      }).refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
      })
    ),
  });

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/auth/list-sessions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as Session[];
        return data || [];
      }
    } catch {}
    return [];
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
    } catch {}
    onSignOut();
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('¿Cerrar esta sesión?')) return;
    try {
      await fetch('/api/auth/revoke-session', { 
        method: 'POST', 
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sessionId })
      });
      const updated = await fetchSessions();
      setSessions(updated);
    } catch {}
  };

  const onPasswordSubmit = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const json = await res.json() as { message?: string };

      if (!res.ok) throw new Error(json.message || 'Error al cambiar contraseña');

      setSuccess('Contraseña actualizada correctamente');
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions().then(setSessions);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
          <span className="text-3xl font-bold text-orange-500">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-gray-400">{user.email}</p>
          {!user.emailVerified && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-900/30 text-yellow-300 rounded">
              Email no verificado
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex gap-6" role="tablist">
          {(['profile', 'password', 'sessions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'profile' && 'Perfil'}
              {tab === 'password' && 'Contraseña'}
              {tab === 'sessions' && 'Sesiones'}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
            <h3 className="font-medium text-white mb-3">Información de la cuenta</h3>
            <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <dt className="text-gray-400">ID</dt>
              <dd className="text-white font-mono text-xs break-all">{user.id}</dd>
              <dt className="text-gray-400">Email</dt>
              <dd className="text-white">{user.email}</dd>
              <dt className="text-gray-400">Nombre</dt>
              <dd className="text-white">{user.name}</dd>
              <dt className="text-gray-400">Creado</dt>
              <dd className="text-white">
                {new Date(user.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
              <dt className="text-gray-400">Email verificado</dt>
              <dd className="text-white">
                {user.emailVerified ? 'Sí' : 'No'}
              </dd>
            </dl>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSignOut}
              className="flex-1 py-2 px-4 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-5" noValidate>
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-700 text-red-300 text-sm">
            Tu sesión actual se cerrará al cambiar la contraseña.
          </div>

          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-1">
              Contraseña actual
            </label>
            <input
              {...register('currentPassword')}
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Contraseña actual"
            />
            {errors.currentPassword && <p className="mt-1 text-sm text-red-400">{errors.currentPassword.message}</p>}
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1">
              Nueva contraseña
            </label>
            <input
              {...register('newPassword')}
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Nueva contraseña (mín. 6 caracteres)"
            />
            {errors.newPassword && <p className="mt-1 text-sm text-red-400">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
              Confirmar nueva contraseña
            </label>
            <input
              {...register('confirmPassword')}
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Confirmar nueva contraseña"
            />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {success && <p className="text-green-400 text-sm text-center">{success}</p>}
        </form>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay sesiones activas</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">
                      🌐
                    </span>
                    <div>
                      <p className="font-medium text-white">
                        {session.userAgent?.includes('Mobile') ? '📱 Móvil' : '💻 Escritorio'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(session.createdAt).toLocaleString('es-ES')}
                        {session.ipAddress && ` · ${session.ipAddress}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Revocar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}