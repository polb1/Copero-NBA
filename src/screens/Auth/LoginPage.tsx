'use client';

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const handleSuccess = async () => {
    await refreshSession();
    navigate('/perfil');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-4 flex justify-between items-center text-sm text-gray-400">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Volver a Anillero</span>
        </Link>
      </div>
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : 'Recuperar contraseña'}
          </h1>
          <p className="text-gray-400">
            {mode === 'login' ? 'Accede a tu cuenta' : mode === 'register' ? 'Crea tu cuenta gratis' : 'Recupera tu contraseña'}
          </p>
        </div>

        {mode === 'login' && (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToRegister={() => setMode('register')}
            onSwitchToForgot={() => setMode('forgot')}
          />
        )}

        {mode === 'register' && (
          <RegisterForm
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}

        {mode === 'forgot' && (
          <ForgotPasswordForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}