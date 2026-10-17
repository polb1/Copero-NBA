import type { BoxLine, StatLine } from './types';
import { gameScore } from './gamesim';
import { emptyStats } from './players';

export function doubleCount(b: BoxLine) {
  const reb = b.oreb + b.dreb;
  return [b.pts, reb, b.ast, b.stl, b.blk].filter((v) => v >= 10).length;
}

export function addBox(s: StatLine, b: BoxLine) {
  if (b.min <= 0) return;
  s.gp++;
  if (b.starter) s.gs++;
  s.min += b.min;
  s.pts += b.pts;
  s.oreb += b.oreb;
  s.dreb += b.dreb;
  s.ast += b.ast;
  s.stl += b.stl;
  s.blk += b.blk;
  s.tov += b.tov;
  s.pf += b.pf;
  s.fgm += b.fgm;
  s.fga += b.fga;
  s.tpm += b.tpm;
  s.tpa += b.tpa;
  s.ftm += b.ftm;
  s.fta += b.fta;
  s.pm += b.pm;
  s.gmsc += gameScore(b);
  const d = doubleCount(b);
  if (d >= 2) s.dd++;
  if (d >= 3) s.td++;
  if (d >= 4) s.qd++;
}

export function sumStats(lines: StatLine[]): StatLine {
  const out = emptyStats();
  for (const l of lines) for (const k of Object.keys(out) as (keyof StatLine)[]) out[k] += l[k];
  return out;
}

export const per = (s: StatLine, k: keyof StatLine) => (s.gp ? s[k] / s.gp : 0);
export const pct = (m: number, a: number) => (a ? m / a : 0);
export const reb = (s: { oreb: number; dreb: number }) => s.oreb + s.dreb;
export const ts = (s: StatLine) => (s.fga + 0.44 * s.fta ? s.pts / (2 * (s.fga + 0.44 * s.fta)) : 0);

export function averages(s: StatLine) {
  const g = s.gp || 1;
  return {
    gp: s.gp,
    gs: s.gs,
    mpg: s.min / g,
    ppg: s.pts / g,
    rpg: reb(s) / g,
    apg: s.ast / g,
    spg: s.stl / g,
    bpg: s.blk / g,
    tpg: s.tov / g,
    fgp: pct(s.fgm, s.fga),
    tpp: pct(s.tpm, s.tpa),
    ftp: pct(s.ftm, s.fta),
    ts: ts(s),
    gmsc: s.gmsc / g,
    pm: s.pm / g,
  };
}

export const f1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
export const fpct = (n: number) => (n ? (n * 100).toFixed(1) + '%' : '—');
