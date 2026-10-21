// Achievement glyph map: engine achievement ids → stroke IconName. No emoji.
import { Icon, type IconName } from '../icons';

export const ACH_ART: Record<string, IconName> = {
  debut: 'ball', lottery: 'ticket', no1: 'crown', undrafted: 'growth', steal: 'diamond',
  pts40: 'flame', pts50: 'flame', td: 'target', td10: 'blocks', qd: 'blocks',
  roy: 'sprout', allstar: 'star', allstar5: 'star', allnba: 'medal', mvp: 'crown',
  dpoy: 'shield', smoy: 'battery', mip: 'growth', playoffs: 'ticket', ring: 'ring',
  rings3: 'trophy', fmvp: 'cup', pts10k: 'number', pts20k: 'number', ovr90: 'bolt',
  loyal: 'building', journeyman: 'suitcase', gleague: 'anvil', longevity: 'hourglass',
  hof: 'museum', max: 'coin',
};

export function AchievementArt({ id, size = 22, locked = false, className }: { id: string; size?: number; locked?: boolean; className?: string }) {
  return (
    <span className={`ach-glyph ${locked ? 'locked' : ''} ${className ?? ''}`} aria-hidden="true">
      <Icon name={locked ? 'lock' : ACH_ART[id] ?? 'star'} size={size} />
    </span>
  );
}
