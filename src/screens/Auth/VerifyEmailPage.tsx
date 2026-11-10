'use client';

import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const callbackURL = searchParams.get('callbackURL') || '/';
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Token de verificación no proporcionado');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          credentials: 'include',
        });

        const data = await res.json() as { message?: string };

        if (!res.ok) {
          throw new Error(data.message || 'Error al verificar email');
        }

        setStatus('success');
        
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = callbackURL;
        }, 2000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Error al verificar email');
      }
    };

    verifyEmail();
  }, [token, callbackURL]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 animate-in fade-in zoom-in-95 duration-300 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-orange-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verificando tu email</h1>
          <p className="text-gray-400">Por favor espera mientras completamos la verificación...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 animate-in fade-in zoom-in-95 duration-300 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Email verificado!</h1>
          <p className="text-gray-400 mb-6">Tu cuenta ha sido verificada correctamente. Redirigiendo...</p>
          <button
            onClick={() => window.location.href = callbackURL}
            className="w-full py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 animate-in fade-in zoom-in-95 duration-300 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Error al verificar</h1>
        <p className="text-gray-400 mb-6">{errorMessage || 'El enlace de verificación es inválido o ha expirado'}</p>
        <div className="space-y-3">
          <a
            href="/auth/login"
            className="w-full py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white transition-colors inline-block"
          >
            Iniciar sesión
          </a>
          <a
            href="/auth/register"
            className="w-full py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-gray-600 font-semibold text-white transition-colors inline-block"
          >
            Crear cuenta
          </a>
        </div>
      </div>
    </div>
  );
}