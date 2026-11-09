import { Component, type ReactNode } from 'react';

interface State { error: Error | null }

/** Last line of defense: never leave the player on a blank page; offer to reload or export the save. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Anillero · Modo Carrera crashed:', error);
    // Auto-reload after 10s if user doesn't act (audit #4)
    this.reloadTimer = setTimeout(() => {
      window.location.reload();
    }, 10000);
  }

  componentWillUnmount() {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
  }

  // import dinámico: el hub no carga el motor del juego salvo que haga falta
  private exportSave = async () => {
    const { lastSlotId, loadCareer, exportCareer } = await import('../store/store');
    const id = lastSlotId();
    const c = id ? loadCareer(id) : null;
    if (c) exportCareer(c);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="simple-wrap">
        <div className="simple-panel" style={{ padding: 28, maxWidth: 560 }}>
          <h2 style={{ fontFamily: 'var(--font-body)', textTransform: 'none' }}>Algo ha salido mal</h2>
          <p className="muted" style={{ marginTop: 8 }}>Tu partida está guardada en este navegador. Puedes recargar, volver al inicio o descargar una copia de seguridad.</p>
          <p className="tiny dim" style={{ marginTop: 8 }}>{this.state.error.message}</p>
          <p className="tiny dim" style={{ marginTop: 8 }}>Recargando automáticamente en 10s...</p>
          <div className="row wrap" style={{ marginTop: 18 }}>
            <button className="btn pill light" onClick={() => window.location.reload()}>Recargar</button>
            <button className="btn pill" onClick={() => { window.location.href = '/'; }}>Inicio</button>
            <button className="btn pill" onClick={this.exportSave}>Exportar partida</button>
          </div>
        </div>
      </div>
    );
  }
}
