import { createRoot } from 'react-dom/client';
import { DragShotGame } from './ui/minigames/DragShotGame';
import type { MinigameSpec } from './engine/types';

const spec = { kind: 'threes', attempts: 5, zone: 30, speed: 1, autoProb: 0.4 } as unknown as MinigameSpec;

createRoot(document.getElementById('root')!).render(
  <DragShotGame
    spec={spec}
    onDone={(n) => console.log('aciertos', n)}
    onSimulate={() => console.log('simular')}
  />,
);
