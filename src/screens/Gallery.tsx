import { Scene, type SceneKind } from '../ui/Scene';

const KINDS: SceneKind[] = ['arena', 'rivalry', 'training', 'locker', 'coach', 'press', 'medical', 'contract', 'money', 'sneakers', 'phone', 'trophy', 'draft', 'travel', 'national', 'summer', 'family', 'clutch', 'contest', 'college', 'europe', 'rest'];

/** Development-only overview of every scene illustration. */
export function Gallery() {
  return (
    <div className="content">
      <div className="grid g3">
        {KINDS.map((k) => <Scene key={k} kind={k} height={170}><h2>{k}</h2></Scene>)}
      </div>
    </div>
  );
}
