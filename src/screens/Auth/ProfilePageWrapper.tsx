'use client';

import { useAuth } from './AuthContext';
import { ProfilePage } from './ProfilePage';
import { useEffect, useState } from 'react';

export function ProfilePageWrapper() {
  const { user, isLoading, logout } = useAuth();
  const [sessions, setSessions] = useState<Array<{
    id: string;
    expiresAt: string;
    createdAt: string;
    ipAddress: string;
    userAgent: string;
  }>>([]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/auth/list-sessions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { sessions?: Array<{
          id: string;
          expiresAt: string;
          createdAt: string;
          ipAddress: string;
          userAgent: string;
        }> };
        return data.sessions || [];
      }
    } catch {}
    return [];
  };

  useEffect(() => {
    if (user) {
      fetchSessions().then(setSessions);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="busy" role="status" aria-live="polite">
          <div className="ball" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-6">
          <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">lock</span>
          <h2 className="text-xl font-bold text-white mb-2">Acceso restringido</h2>
          <p className="text-gray-400 text-sm mb-6">Debes iniciar sesión para ver y gestionar tu perfil</p>
          <div className="flex flex-col gap-2">
            <a
              href="/auth/login"
              className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 font-semibold text-white transition-colors"
            >
              Iniciar sesión
            </a>
            <a
              href="/"
              className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
            >
              Volver a la portada
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <ProfilePage user={user} sessions={sessions} onSignOut={logout} />;
}