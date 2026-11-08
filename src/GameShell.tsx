// Todo lo del simulador (motor, partidas guardadas, logros). Se carga aparte para que el hub no lo descargue.
import { Navigate, Outlet } from 'react-router-dom';
import { AchievementWatcher } from './ui/AchievementToast';
import { applySettings, consolidateSaves, lastSlotId, loadCareer, store, useCareer } from './store/store';
import { Start } from './screens/simple/Start';
import { Play } from './screens/simple/Play';
import { Careers } from './screens/simple/Careers';

export { Start, Careers };

/** Loads the saved career before the first render, so the splash goes straight to the game (no blank frame). */
let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  applySettings(store.get().settings);
  consolidateSaves();
  const id = lastSlotId();
  if (id) {
    const c = loadCareer(id);
    if (c) store.setCareer(c, false);
  }
}

export function GameShell() {
  boot();
  return (
    <>
      <Outlet />
      <AchievementWatcher />
    </>
  );
}

/** Language landings (/en/, /ca/) go straight into the game: the current career, or creating one. */
export function GameEntry() {
  const c = useCareer();
  return <Navigate to={c ? '/play' : '/start'} replace />;
}

/** /play only makes sense with a career: without one, start creating it. */
export function PlayEntry() {
  const c = useCareer();
  return c ? <Play /> : <Navigate to="/start" replace />;
}
