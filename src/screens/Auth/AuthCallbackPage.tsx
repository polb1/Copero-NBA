'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function AuthCallbackPage() {
  const { user, isLoading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void refreshSession().finally(() => {
      if (active) setSessionChecked(true);
    });
    return () => { active = false; };
  }, [refreshSession]);

  useEffect(() => {
    if (user) navigate('/perfil', { replace: true });
  }, [user, navigate]);

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900/90 p-8 text-center">
        {isLoading || !sessionChecked ? (
          <>
            <div className="busy mx-auto mb-5" role="status" aria-live="polite"><div className="ball" /></div>
            <h1 className="text-2xl font-bold text-white mb-2">Comprobando tu sesión</h1>
            <p className="text-gray-400">Estamos terminando el inicio de sesión con Google.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">No se pudo recuperar tu sesión</h1>
            <p className="text-gray-400 mb-6">Vuelve a iniciar sesión. Si el problema continúa, prueba con tu email.</p>
            <div className="flex flex-col gap-3">
              <Link to="/auth/login" className="rounded-lg bg-orange-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-orange-600">
                Volver a iniciar sesión
              </Link>
              <Link to="/" className="text-sm text-gray-400 transition-colors hover:text-white">
                Volver a Anillero
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
