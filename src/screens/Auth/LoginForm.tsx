'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TurnstileWidget } from './TurnstileWidget';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  turnstileToken: z.string().min(1, 'Completa el captcha'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: (user: { id: string; email: string; name: string }) => void;
  onSwitchToRegister?: () => void;
  onSwitchToForgot?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister, onSwitchToForgot }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const json = await res.json() as { message?: string; user?: { id: string; email: string; name: string } };

      if (!res.ok) {
        throw new Error(json.message || 'Error al iniciar sesión');
      }

      if (json.user) {
        onSuccess?.(json.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {error && (
        <div className="p-3 rounded bg-red-900/30 border border-red-700 text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          autoComplete="email"
          className={`w-full px-4 py-2.5 rounded-lg bg-gray-800 border ${
            errors.email ? 'border-red-500' : 'border-gray-600'
          } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
          placeholder="tu@email.com"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          Contraseña
        </label>
        <input
          {...register('password')}
          id="password"
          type="password"
          autoComplete="current-password"
          className={`w-full px-4 py-2.5 rounded-lg bg-gray-800 border ${
            errors.password ? 'border-red-500' : 'border-gray-600'
          } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
          placeholder="••••••••"
          disabled={isLoading}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div>
        <div className="flex justify-center overflow-hidden">
          <TurnstileWidget
            onToken={(token) => setValue('turnstileToken', token)}
            onError={() => setError('Error en el captcha. Inténtalo de nuevo.')}
            onExpire={() => setError('El captcha ha expirado. Completa de nuevo.')}
          />
        </div>
        {errors.turnstileToken && (
          <p className="mt-1 text-sm text-red-400">{errors.turnstileToken.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        {isLoading ? 'Entrando...' : 'Entrar'}
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-gray-900 text-gray-500">O continúa con</span>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          try {
            const res = await fetch('/api/auth/sign-in/social', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ provider: 'google', callbackURL: window.location.origin + '/auth/callback' }),
            });
            const data = await res.json() as { url?: string; redirect?: boolean };
            if (data.url && data.redirect) {
              window.location.href = data.url;
            }
          } catch (err) {
            console.error('Google sign-in error:', err);
          }
        }}
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-gray-600 disabled:opacity-50 font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Continuar con Google</span>
      </button>

      <div className="space-y-3 text-center text-sm text-gray-400">
        <button
          type="button"
          onClick={() => onSwitchToForgot?.()}
          className="text-orange-400 hover:text-orange-300 underline"
        >
          ¿Olvidaste tu contraseña?
        </button>
        <p>
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={() => onSwitchToRegister?.()}
            className="text-orange-400 hover:text-orange-300 underline"
          >
            Regístrate
          </button>
        </p>
      </div>
    </form>
  );
}
