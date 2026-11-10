'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TurnstileWidget } from './TurnstileWidget';

const forgotSchema = z.object({
  email: z.string().email('Email inválido'),
  turnstileToken: z.string().min(1, 'Completa el captcha'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

interface ForgotPasswordFormProps {
  onSuccess?: (email: string) => void;
  onSwitchToLogin?: () => void;
}

export function ForgotPasswordForm({ onSuccess, onSwitchToLogin }: ForgotPasswordFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: data.email, redirectTo: window.location.origin + '/auth/reset-password' }),
      });

      const json = await res.json() as { message?: string; status?: boolean };

      if (!res.ok) {
        throw new Error(json.message || 'Error al solicitar reset');
      }

      setSuccess(true);
      onSuccess?.(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
          <p className="text-green-300 font-medium">¡Email enviado!</p>
          <p className="text-sm text-green-400 mt-1">
            Revisa tu bandeja de entrada (y spam) para restablecer tu contraseña.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitchToLogin?.()}
          className="w-full py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white transition-colors"
        >
          Volver al login
        </button>
      </div>
    );
  }

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
        <TurnstileWidget
          onToken={(token) => setValue('turnstileToken', token)}
          onError={() => setError('Error en el captcha. Inténtalo de nuevo.')}
          onExpire={() => setError('El captcha ha expirado. Completa de nuevo.')}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
      </button>

      <p className="text-center text-sm text-gray-400">
        ¿Recordaste tu contraseña?{' '}
        <button
          type="button"
          onClick={() => onSwitchToLogin?.()}
          className="text-orange-400 hover:text-orange-300 underline"
        >
          Volver al login
        </button>
      </p>
    </form>
  );
}