import { useEffect, type ReactNode } from 'react';

/** In-game confirmation (replaces the browser's confirm()): backdrop, icon, title, text and two buttons. */
export function ConfirmModal({ icon, kicker, title, children, confirmLabel, cancelLabel = 'Cancelar', danger, onConfirm, onCancel }: {
  icon: string;
  kicker?: string;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="recap confirm-modal" role="alertdialog" aria-modal="true" aria-label={title} onClick={onCancel}>
      <div className={`recap-box ${danger ? 'danger' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon" aria-hidden="true">{icon}</div>
        {kicker && <span className="recap-kicker">{kicker}</span>}
        <h2>{title}</h2>
        {children && <div className="confirm-body">{children}</div>}
        <div className="confirm-actions">
          <button type="button" className="btn pill" onClick={onCancel} autoFocus>{cancelLabel}</button>
          <button type="button" className={`btn pill ${danger ? 'danger-btn' : 'light'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
