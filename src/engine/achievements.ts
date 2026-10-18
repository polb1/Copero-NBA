import type { Career } from './types';
import { awardCounts, careerTotals, LEGACY_TIERS, legacyScore, playoffTotals } from './legacy';

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  check: (c: Career) => boolean;
}

const has = (c: Career, award: string, n = 1) => (awardCounts(c)[award] ?? 0) >= n;
const peak = (c: Career) => Math.max(0, ...c.ovrHistory.map((o) => o.ovr));

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'debut', title: 'Debut NBA', desc: 'Juega tu primer partido en la NBA.', icon: '🏀', check: (c) => c.gameLog.some((g) => g.comp === 'NBA' && g.line) || careerTotals(c).gp > 0 },
  { id: 'lottery', title: 'Lotería', desc: 'Sé elegido entre los 14 primeros del draft.', icon: '🎟️', check: (c) => !!c.predraft?.userPick && c.predraft.userPick.round === 1 && c.predraft.userPick.pick <= 14 },
  { id: 'no1', title: 'Número uno', desc: 'Sé el primer pick del draft.', icon: '1️⃣', check: (c) => c.predraft?.userPick?.pick === 1 && c.predraft.userPick.round === 1 },
  { id: 'undrafted', title: 'Desde abajo', desc: 'Llega a la NBA sin ser drafteado.', icon: '🧗', check: (c) => c.flags.undrafted === 1 && careerTotals(c).gp > 0 },
  { id: 'steal', title: 'Robo del draft', desc: 'Elegido en 2.ª ronda o no drafteado y All-Star.', icon: '💎', check: (c) => (c.flags.undrafted === 1 || c.predraft?.userPick?.round === 2) && has(c, 'allStar') },
  { id: 'pts40', title: 'Noche de 40', desc: 'Anota 40 puntos en un partido NBA.', icon: '🔥', check: (c) => (c.highs.pts?.value ?? 0) >= 40 },
  { id: 'pts50', title: 'Club de los 50', desc: 'Anota 50 puntos en un partido NBA.', icon: '🌋', check: (c) => (c.highs.pts?.value ?? 0) >= 50 },
  { id: 'td', title: 'Triple-doble', desc: 'Consigue un triple-doble en la NBA.', icon: '🎯', check: (c) => careerTotals(c).td > 0 },
  { id: 'td10', title: 'Máquina de triples-dobles', desc: '10 triples-dobles en tu carrera NBA.', icon: '🧮', check: (c) => careerTotals(c).td >= 10 },
  { id: 'qd', title: 'Cuádruple-doble', desc: 'Logra un cuádruple-doble.', icon: '🦄', check: (c) => careerTotals(c).qd > 0 },
  { id: 'roy', title: 'Novato del año', desc: 'Gana el Rookie of the Year.', icon: '🌱', check: (c) => has(c, 'roy') },
  { id: 'allstar', title: 'All-Star', desc: 'Sé elegido para el All-Star.', icon: '⭐', check: (c) => has(c, 'allStar') },
  { id: 'allstar5', title: 'Habitual del All-Star', desc: '5 selecciones All-Star.', icon: '🌟', check: (c) => has(c, 'allStar', 5) },
  { id: 'allnba', title: 'All-NBA', desc: 'Entra en un quinteto All-NBA.', icon: '🏅', check: (c) => has(c, 'allNba1') || has(c, 'allNba2') || has(c, 'allNba3') },
  { id: 'mvp', title: 'MVP', desc: 'Gana el MVP de la temporada.', icon: '👑', check: (c) => has(c, 'mvp') },
  { id: 'dpoy', title: 'Muro', desc: 'Gana el Defensor del Año.', icon: '🛡️', check: (c) => has(c, 'dpoy') },
  { id: 'smoy', title: 'Energía desde el banquillo', desc: 'Gana el Sexto Hombre del Año.', icon: '🔋', check: (c) => has(c, 'smoy') },
  { id: 'mip', title: 'Salto de calidad', desc: 'Gana el Jugador Más Mejorado.', icon: '📈', check: (c) => has(c, 'mip') },
  { id: 'playoffs', title: 'Postemporada', desc: 'Juega un partido de playoffs.', icon: '🎟', check: (c) => playoffTotals(c).gp > 0 },
  { id: 'ring', title: 'Anillo', desc: 'Gana un campeonato de la NBA.', icon: '💍', check: (c) => has(c, 'champion') },
  { id: 'rings3', title: 'Dinastía', desc: 'Gana 3 campeonatos.', icon: '🏆', check: (c) => has(c, 'champion', 3) },
  { id: 'fmvp', title: 'MVP de las Finales', desc: 'Sé el MVP de unas Finales.', icon: '🥇', check: (c) => has(c, 'fmvp') },
  { id: 'pts10k', title: '10.000 puntos', desc: 'Alcanza 10.000 puntos en la NBA.', icon: '🔟', check: (c) => careerTotals(c).pts >= 10000 },
  { id: 'pts20k', title: '20.000 puntos', desc: 'Alcanza 20.000 puntos en la NBA.', icon: '💯', check: (c) => careerTotals(c).pts >= 20000 },
  { id: 'ovr90', title: 'Élite', desc: 'Alcanza un OVR de 90.', icon: '⚡', check: (c) => peak(c) >= 90 },
  { id: 'loyal', title: 'Hombre de franquicia', desc: '10 temporadas en el mismo equipo.', icon: '🏟️', check: (c) => { const m: Record<string, number> = {}; for (const s of c.seasons) if (s.comp === 'NBA' && s.teamId) m[s.teamId] = (m[s.teamId] ?? 0) + 1; return Math.max(0, ...Object.values(m)) >= 10; } },
  { id: 'journeyman', title: 'Trotamundos', desc: 'Juega en 5 franquicias distintas.', icon: '🧳', check: (c) => new Set(c.seasons.filter((s) => s.comp === 'NBA' && s.teamId).map((s) => s.teamId)).size >= 5 },
  { id: 'gleague', title: 'Forjado en la G League', desc: 'Juega en la G League y luego sé titular en la NBA.', icon: '🔨', check: (c) => c.seasons.some((s) => s.comp === 'GLG') && careerTotals(c).gs >= 41 },
  { id: 'longevity', title: 'Longevidad', desc: '15 temporadas en la NBA.', icon: '⏳', check: (c) => c.seasons.filter((s) => s.comp === 'NBA' && s.stats.gp > 0).length >= 15 },
  { id: 'hof', title: 'Inmortal', desc: 'Retírate con un Legacy Score de Hall of Fame.', icon: '🏛️', check: (c) => c.phase === 'retired' && legacyScore(c) >= LEGACY_TIERS.hof },
  { id: 'max', title: 'Contrato máximo', desc: 'Firma un contrato máximo.', icon: '💰', check: (c) => c.flags.maxContract === 1 },
];

export function newlyUnlocked(c: Career): string[] {
  return ACHIEVEMENTS.filter((a) => !c.achievements.includes(a.id) && a.check(c)).map((a) => a.id);
}
