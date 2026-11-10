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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Debes iniciar sesión para ver tu perfil</p>
        </div>
      </div>
    );
  }

  return <ProfilePage user={user} sessions={sessions} onSignOut={logout} />;
}