'use client';

import { useState, useEffect } from 'react';

interface ClaimGuestPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => void;
  hasGuestData: boolean;
  guestStats?: {
    careers: number;
    daysPlayed: number;
  };
}

export function ClaimGuestPrompt({
  isOpen,
  onClose,
  onClaim,
  hasGuestData,
  guestStats,
}: ClaimGuestPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !hasGuestData) return null;

  const handleClaim = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/me/claim-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guestId: localStorage.getItem('guestId') }),
      });

      const json = await res.json() as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || 'Error al reclamar datos');
      }

      onClaim();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reclamar datos');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">¿Guardar tu progreso?</h2>
              <p className="text-gray-400 text-sm">Has jugado como invitado. Si creas una cuenta, puedes conservar tu historial.</p>
            </div>
          </div>

          {guestStats && (
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <p className="text-sm text-gray-300 mb-2">Tu progreso actual como invitado:</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-400">{guestStats.careers}</p>
                  <p className="text-xs text-gray-400">Carreras jugadas</p>
                </div>
                <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-400">{guestStats.daysPlayed}</p>
                  <p className="text-xs text-gray-400">Días jugados</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleClaim}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              {isLoading ? 'Guardando progreso...' : 'Guardar mi progreso y crear cuenta'}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors"
            >
              Ahora no, gracias
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center" role="alert">{error}</p>
          )}

          <p className="text-center text-xs text-gray-500">
            Tu progreso local se guarda automáticamente. Al crear cuenta, se fusionará con tu cuenta.
          </p>
        </div>
      </div>

      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
    </div>
  );
}