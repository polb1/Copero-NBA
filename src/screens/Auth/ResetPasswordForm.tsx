'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TurnstileWidget } from './TurnstileWidget';

const resetSchema = z.object({
  password: z.string().min(6, 'Mínimo 6 caracteres').max(50, 'Máximo 50 caracteres'),
  confirmPassword: z.string(),
  turnstileToken: z.string().min(1, 'Completa el captcha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ResetFormData = z.infer<typeof resetSchema>;

interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function ResetPasswordForm({ token, onSuccess, onSwitchToLogin }: ResetPasswordFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const json = await res.json() as { message?: string };

      if (!res.ok) {
        throw new Error(json.message || 'Error al restablecer contraseña');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
          <p className="text-green-300 font-medium">¡Contraseña restablecida!</p>
          <p className="text-sm text-green-400 mt-1">
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitchToLogin?.()}
          className="w-full py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white transition-colors"
        >
          Ir al login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />

      {error && (
        <div className="p-3 rounded bg-red-900/30 border border-red-700 text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          Nueva contraseña
        </label>
        <input
          {...register('password')}
          id="password"
          type="password"
          autoComplete="new-password"
          className={`w-full px-4 py-2.5 rounded-lg bg-gray-800 border ${
            errors.password ? 'border-red-500' : 'border-gray-600'
          } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
          Confirmar contraseña
        </label>
        <input
          {...register('confirmPassword')}
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={`w-full px-4 py-2.5 rounded-lg bg-gray-800 border ${
            errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
          } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
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
        disabled={false}
        className="w-full py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        Restablecer contraseña
      </button>

      <p className="text-center text-sm text-gray-400">
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