import { useState } from 'react';
import { useCareer } from '../store/store';
import { userOf } from '../engine/career';
import { averages, f1, fpct, sumStats } from '../engine/stats';
import { fmtDate, seasonLabel } from '../engine/schedule';
import { fullName } from '../engine/players';
import { RULES } from '../engine/config';
import { Card, Empty, PageHead, STAT_HEAD, StatLineRow } from '../ui/common';
import { BarChart, LineChart } from '../ui/charts';
import type { Career, Player } from '../engine/types';

type Tab = 'season' | 'career' | 'charts' | 'leaders';

export function Stats() {
  const c = useCareer()!;
  const [tab, setTab] = useState<Tab>('season');
  return (
    <>
      <PageHead eyebrow="Resultados y estadísticas" title="Estadísticas">
        <div className="seg">
          {([['season', 'Temporada'], ['career', 'Carrera'], ['charts', 'Gráficos'], ['leaders', 'Líderes']] as [Tab, string][]).map(([k, l]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}
        </div>
      </PageHead>
      {tab === 'season' && <SeasonTab c={c} />}
      {tab === 'career' && <CareerTab c={c} />}
      {tab === 'charts' && <ChartsTab c={c} />}
      {tab === 'leaders' && <LeadersTab c={c} />}
    </>
  );
}

function SeasonTab({ c }: { c: Career }) {
  const u = userOf(c);
  const games = c.gameLog.slice().reverse();
  const nba = u.season;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Card title={`Promedios ${seasonLabel(c.league.season)}`} icon="chart">
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th className="l">Competición</th>{STAT_HEAD.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {nba.gp > 0 && <StatLineRow s={nba} label="NBA · Temporada regular" />}
              {u.playoffs.gp > 0 && <StatLineRow s={u.playoffs} label="NBA · Playoffs" />}
              {c.satStats.gp > 0 && <StatLineRow s={c.satStats} label={c.satellite?.comp === 'GLG' ? 'G League' : c.satellite?.comp ?? 'Otra'} />}
            </tbody>
          </table>
        </div>
        {nba.gp + c.satStats.gp === 0 && <Empty title="Sin partidos esta temporada" />}
        {nba.gp > 0 && <p className="small muted" style={{ marginTop: 10 }}>Dobles-dobles: {nba.dd} · Triples-dobles: {nba.td}{nba.qd ? ` · Cuádruples-dobles: ${nba.qd}` : ''} · +/- medio: {f1(averages(nba).pm)} · Valoración media (Game Score): {f1(averages(nba).gmsc)}</p>}
      </Card>
      <Card title="Registro de partidos" icon="ball">
        {games.length === 0 ? <Empty title="Aún no hay partidos" /> : (
          <div className="table-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
            <table className="t">
              <thead><tr><th className="l">Fecha</th><th className="l">Rival</th><th>Res.</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>ROB</th><th>TAP</th><th>PÉR</th><th>TC</th><th>T3</th><th>TL</th><th>+/-</th></tr></thead>
              <tbody>
                {games.map((g, i) => (
                  <tr key={i}>
                    <td className="l dim">{fmtDate(g.season, g.day)}{g.comp !== 'NBA' ? ` · ${g.comp}` : g.kind !== 'regular' ? ` · ${g.kind === 'playoff' ? 'PO' : 'PI'}` : ''}</td>
                    <td className="l">{g.home ? 'vs' : '@'} {g.oppName}</td>
                    <td><span className={`wl ${g.teamScore > g.oppScore ? 'w' : 'l'}`}>{g.teamScore > g.oppScore ? 'V' : 'D'}</span></td>
                    {g.line ? (
                      <>
                        <td>{Math.round(g.line.min)}</td><td><b>{g.line.pts}</b></td><td>{g.line.oreb + g.line.dreb}</td><td>{g.line.ast}</td><td>{g.line.stl}</td><td>{g.line.blk}</td><td>{g.line.tov}</td>
                        <td>{g.line.fgm}/{g.line.fga}</td><td>{g.line.tpm}/{g.line.tpa}</td><td>{g.line.ftm}/{g.line.fta}</td><td>{g.line.pm > 0 ? '+' : ''}{g.line.pm}</td>
                      </>
                    ) : <td colSpan={11} className="l dim">{g.dnp ?? 'No jugó'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function CareerTab({ c }: { c: Career }) {
  const nba = c.seasons.filter((s) => s.comp === 'NBA');
  const other = c.seasons.filter((s) => s.comp !== 'NBA');
  const po = nba.filter((s) => s.playoffs);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Card title="NBA · Temporada regular" icon="table">
        {nba.length === 0 ? <Empty title="Sin temporadas NBA completadas" /> : (
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th className="l">Temporada</th><th className="l">Equipo</th>{STAT_HEAD.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {nba.map((s, i) => <StatLineRowTeam key={i} label={seasonLabel(s.season)} team={s.teamName} s={s.stats} />)}
                <StatLineRowTeam label="Carrera" team="" s={sumStats(nba.map((s) => s.stats))} bold />
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {po.length > 0 && (
        <Card title="NBA · Playoffs" icon="trophy">
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th className="l">Temporada</th><th className="l">Equipo</th>{STAT_HEAD.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {po.map((s, i) => <StatLineRowTeam key={i} label={seasonLabel(s.season)} team={s.teamName} s={s.playoffs!} />)}
                <StatLineRowTeam label="Total" team="" s={sumStats(po.map((s) => s.playoffs!))} bold />
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {other.length > 0 && (
        <Card title="Otras competiciones" icon="ball">
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th className="l">Temporada</th><th className="l">Equipo</th>{STAT_HEAD.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{other.map((s, i) => <StatLineRowTeam key={i} label={`${seasonLabel(s.season)} · ${s.comp}`} team={s.teamName} s={s.stats} />)}</tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatLineRowTeam({ label, team, s, bold }: { label: string; team: string; s: Parameters<typeof StatLineRow>[0]['s']; bold?: boolean }) {
  const a = averages(s);
  return (
    <tr style={bold ? { fontWeight: 700 } : undefined} className={bold ? 'me' : ''}>
      <td className="l">{label}</td><td className="l">{team}</td>
      <td>{s.gp}</td><td>{s.gs}</td><td>{f1(a.mpg)}</td><td><b>{f1(a.ppg)}</b></td><td>{f1(a.rpg)}</td><td>{f1(a.apg)}</td><td>{f1(a.spg)}</td><td>{f1(a.bpg)}</td><td>{f1(a.tpg)}</td><td>{fpct(a.fgp)}</td><td>{fpct(a.tpp)}</td><td>{fpct(a.ftp)}</td><td>{fpct(a.ts)}</td>
    </tr>
  );
}

function ChartsTab({ c }: { c: Career }) {
  const s = c.seasons.filter((x) => x.comp === 'NBA' && x.stats.gp > 0);
  const labels = s.map((x) => seasonLabel(x.season).slice(2));
  const games = c.gameLog.filter((g) => g.line && g.comp === 'NBA');
  if (!s.length && !games.length) return <Card><Empty icon="📈" title="Los gráficos aparecerán cuando juegues en la NBA" /></Card>;
  return (
    <div className="grid g2">
      <Card title="Puntos, rebotes y asistencias" icon="chart"><LineChart labels={labels} series={[{ label: 'PTS', color: 'var(--accent)', values: s.map((x) => averages(x.stats).ppg) }, { label: 'REB', color: '#34d399', values: s.map((x) => averages(x.stats).rpg) }, { label: 'AST', color: '#60a5fa', values: s.map((x) => averages(x.stats).apg) }]} format={(v) => v.toFixed(1)} /></Card>
      <Card title="Minutos por partido" icon="chart"><BarChart labels={labels} values={s.map((x) => averages(x.stats).mpg)} format={(v) => v.toFixed(1)} /></Card>
      <Card title="Eficiencia de tiro" icon="chart"><LineChart labels={labels} series={[{ label: 'TS%', color: 'var(--accent)', values: s.map((x) => averages(x.stats).ts * 100) }, { label: 'TC%', color: '#a78bfa', values: s.map((x) => averages(x.stats).fgp * 100) }, { label: 'T3%', color: '#fbbf24', values: s.map((x) => averages(x.stats).tpp * 100) }]} format={(v) => v.toFixed(0) + '%'} /></Card>
      <Card title="Puntos en los últimos partidos" icon="ball"><BarChart labels={games.slice(-20).map((g) => g.oppName.split(' ').slice(-1)[0].slice(0, 3).toUpperCase())} values={games.slice(-20).map((g) => g.line!.pts)} /></Card>
    </div>
  );
}

function LeadersTab({ c }: { c: Career }) {
  const L = c.league;
  const pool = Object.values(L.players).filter((p) => p.teamId && p.season.gp >= Math.max(5, Math.round((L.teams[p.teamId]?.w + L.teams[p.teamId]?.l || 0) * (RULES.statLeaderMinGames / 82))));
  const cats: { k: string; label: string; fn: (p: Player) => number; fmt: (v: number) => string }[] = [
    { k: 'pts', label: 'Puntos', fn: (p) => p.season.pts / p.season.gp, fmt: f1 },
    { k: 'reb', label: 'Rebotes', fn: (p) => (p.season.oreb + p.season.dreb) / p.season.gp, fmt: f1 },
    { k: 'ast', label: 'Asistencias', fn: (p) => p.season.ast / p.season.gp, fmt: f1 },
    { k: 'stl', label: 'Robos', fn: (p) => p.season.stl / p.season.gp, fmt: f1 },
    { k: 'blk', label: 'Tapones', fn: (p) => p.season.blk / p.season.gp, fmt: f1 },
    { k: 'ts', label: 'True shooting (8+ tiros)', fn: (p) => (p.season.fga / p.season.gp >= 8 ? averages(p.season).ts * 100 : 0), fmt: (v) => v.toFixed(1) + '%' },
  ];
  if (!pool.length) return <Card><Empty icon="📊" title="La temporada aún no ha empezado" /></Card>;
  return (
    <div className="grid g3">
      {cats.map((cat) => {
        const sorted = [...pool].sort((a, b) => cat.fn(b) - cat.fn(a));
        const top = sorted.slice(0, 8);
        const myRank = sorted.findIndex((p) => p.isUser);
        return (
          <Card key={cat.k} title={cat.label} icon="trophy">
            <table className="t">
              <tbody>
                {top.map((p, i) => (
                  <tr key={p.id} className={p.isUser ? 'me' : ''}><td className="l">{i + 1}. {fullName(p)} <span className="dim tiny">{p.teamId}</span></td><td><b>{cat.fmt(cat.fn(p))}</b></td></tr>
                ))}
                {myRank >= 8 && <tr className="me"><td className="l">{myRank + 1}. Tú</td><td>{cat.fmt(cat.fn(sorted[myRank]))}</td></tr>}
              </tbody>
            </table>
          </Card>
        );
      })}
    </div>
  );
}
