import type { MinigameSpec } from '../engine/types';
import { ShotMeter } from './ShotMeter';
import { TargetGame } from './minigames/TargetGame';
import { PowerGame } from './minigames/PowerGame';
import { ReactionGame } from './minigames/ReactionGame';
import { ChoiceGame } from './minigames/ChoiceGame';
import { DragShotGame } from './minigames/DragShotGame';

/** Dispatches a challenge to the widget that plays it. Absent mechanic (saves v1) = shot meter. */
export function Minigame({ spec, onDone, onSimulate }: { spec: MinigameSpec; onDone: (made: number) => void; onSimulate: () => void }) {
  switch (spec.mechanic ?? 'meter') {
    case 'target':
      return <TargetGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
    case 'power':
      return <PowerGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
    case 'reaction':
      return <ReactionGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
    case 'choice':
      return <ChoiceGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
    case 'drag':
      return <DragShotGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
    default:
      return <ShotMeter spec={spec} onDone={onDone} onSimulate={onSimulate} />;
  }
}
