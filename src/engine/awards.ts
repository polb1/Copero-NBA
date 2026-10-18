import type { AwardResult, League, Player } from './types';
import { RULES } from './config';
import { averages } from './stats';
import { composites } from './attributes';
import { fullName } from './players';

const winPct = (league: League, p: Player) => {
  const t = p.teamId ? league.teams[p.teamId] : null;
  return t && t.w + t.l ? t.w / (t.w + t.l) : 0.4;
};

export function mvpScore(league: League, p: Player) {
  const a = averages(p.season);
  return a.gmsc * 1.0 + a.ppg * 0.28 + (a.ts - 0.56) * 25 + winPct(league, p) * 14;
}

export function dpoyScore(league: League, p: Player) {
  const a = averages(p.season);
  const c = composites(p.attrs);
  return a.spg * 2.4 + a.bpg * 2.2 + (p.season.dreb / Math.max(1, p.season.gp)) * 0.3 + c.defense * 0.11 + winPct(league, p) * 4 + (a.mpg - 28) * 0.08;
}

function eligible(p: Player, games: number) {
  return p.season.gp >= games && p.season.min / Math.max(1, p.season.gp) >= RULES.awardMinMinutes;
}

export function scaleGames(league: League, full: number) {
  // Thresholds scale with games played so far (for mid-season views).
  const t = Object.values(league.teams)[0];
  const played = t ? t.w + t.l : RULES.gamesPerSeason;
  return Math.round((full * played) / RULES.gamesPerSeason);
}

const active = (league: League) => Object.values(league.players).filter((p) => !p.retired && p.teamId && p.season.gp > 0);

export function computeAwards(league: League): AwardResult {
  const players = active(league);
  const minG = RULES.awardMinGames;
  const top = (list: Player[], score: (p: Player) => number, n: number) =>
    [...list].map((p) => ({ p, s: score(p) })).sort((a, b) => b.s - a.s).slice(0, n);
  const elig = players.filter((p) => eligible(p, minG));
  const mvpVoting = top(elig, (p) => mvpScore(league, p), 15);
  const allNbaIds = mvpVoting.map((x) => x.p.id);
  const allNba = [allNbaIds.slice(0, 5), allNbaIds.slice(5, 10), allNbaIds.slice(10, 15)];
  const dp = top(elig, (p) => dpoyScore(league, p), 10);
  const allDef = [dp.slice(0, 5).map((x) => x.p.id), dp.slice(5, 10).map((x) => x.p.id)];
  const rookies = players.filter((p) => p.yearsPro === 0 && p.season.gp >= 40);
  const roy = top(rookies, (p) => averages(p.season).gmsc * Math.min(1, p.season.gp / 70) + averages(p.season).ppg * 0.2, 1)[0];
  const bench = players.filter((p) => eligible(p, minG) && p.season.gs < p.season.gp / 2);
  const smoy = top(bench, (p) => averages(p.season).gmsc + averages(p.season).ppg * 0.25, 1)[0];
  const mipPool = players.filter((p) => p.prevGmsc !== undefined && p.season.gp >= RULES.statLeaderMinGames && p.age <= 29 && p.yearsPro >= 1);
  const mip = top(mipPool, (p) => averages(p.season).gmsc - (p.prevGmsc ?? 0), 1)[0];
  const leaderPool = players.filter((p) => p.season.gp >= RULES.statLeaderMinGames);
  const leader = (fn: (p: Player) => number) => {
    const best = [...leaderPool].sort((a, b) => fn(b) - fn(a))[0];
    return best ? { pid: best.id, value: fn(best) } : undefined;
  };
  const g = (p: Player) => Math.max(1, p.season.gp);
  const names: Record<string, string> = {};
  const res: AwardResult = {
    season: league.season,
    mvp: mvpVoting[0]?.p.id,
    dpoy: dp[0]?.p.id,
    roy: roy?.p.id,
    smoy: smoy?.p.id,
    mip: mip?.p.id,
    allNba,
    allDef,
    allStars: [],
    leaders: {
      pts: leader((p) => p.season.pts / g(p)),
      reb: leader((p) => (p.season.oreb + p.season.dreb) / g(p)),
      ast: leader((p) => p.season.ast / g(p)),
      stl: leader((p) => p.season.stl / g(p)),
      blk: leader((p) => p.season.blk / g(p)),
    },
    names,
    mvpVoting: mvpVoting.slice(0, 5).map((x) => ({ pid: x.p.id, score: Math.round(x.s * 10) / 10 })),
  };
  return res;
}

export function selectAllStars(league: League, bonus: (p: Player) => number = () => 0): string[] {
  const out: string[] = [];
  for (const conf of ['E', 'W'] as const) {
    const pool = active(league).filter((p) => league.teams[p.teamId!].conf === conf && p.season.gp >= scaleGames(league, 35));
    const ranked = pool.map((p) => ({ p, s: mvpScore(league, p) + (bonus(p) - 40) * 0.04 })).sort((a, b) => b.s - a.s);
    out.push(...ranked.slice(0, 12).map((x) => x.p.id));
  }
  return out;
}

export function finalsMvp(league: League): string | undefined {
  const ps = league.postseason;
  if (!ps?.champion || !ps.finalsGmsc) return undefined;
  const champRoster = new Set(league.teams[ps.champion].roster);
  return Object.entries(ps.finalsGmsc).filter(([pid]) => champRoster.has(pid)).sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function snapshotNames(league: League, a: AwardResult) {
  const ids = new Set<string>([
    a.mvp, a.dpoy, a.roy, a.smoy, a.mip, a.fmvp, ...a.allNba.flat(), ...a.allDef.flat(), ...a.allStars,
    ...Object.values(a.leaders).map((l) => l?.pid), ...a.mvpVoting.map((m) => m.pid),
  ].filter(Boolean) as string[]);
  for (const id of ids) {
    const p = league.players[id];
    if (p) a.names[id] = `${fullName(p)} (${p.teamId ?? '—'})`;
  }
}

export const AWARD_LABEL: Record<string, string> = {
  mvp: 'MVP', dpoy: 'Defensor del Año', roy: 'Rookie del Año', smoy: 'Sexto Hombre del Año', mip: 'Jugador Más Mejorado', fmvp: 'MVP de las Finales',
  allNba1: 'All-NBA 1.er equipo', allNba2: 'All-NBA 2.º equipo', allNba3: 'All-NBA 3.er equipo', allDef1: 'All-Defensive 1.er equipo', allDef2: 'All-Defensive 2.º equipo',
  allStar: 'All-Star', champion: 'Campeón NBA', threeContest: 'Campeón del concurso de triples', euroChampion: 'Campeón de liga', euroMvp: 'MVP de la liga', ptsLeader: 'Máximo anotador', rebLeader: 'Líder en rebotes', astLeader: 'Líder en asistencias', stlLeader: 'Líder en robos', blkLeader: 'Líder en tapones',
};

/** Awards won by a given player in an AwardResult, as label keys. */
export function awardsFor(a: AwardResult, pid: string): string[] {
  const out: string[] = [];
  for (const k of ['mvp', 'dpoy', 'roy', 'smoy', 'mip', 'fmvp'] as const) if (a[k] === pid) out.push(k);
  a.allNba.forEach((t, i) => t.includes(pid) && out.push(`allNba${i + 1}`));
  a.allDef.forEach((t, i) => t.includes(pid) && out.push(`allDef${i + 1}`));
  if (a.allStars.includes(pid)) out.push('allStar');
  (['pts', 'reb', 'ast', 'stl', 'blk'] as const).forEach((k) => a.leaders[k]?.pid === pid && out.push(`${k}Leader`));
  return out;
}
