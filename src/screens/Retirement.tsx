import { useNavigate } from 'react-router-dom';
import { store, useCareer } from '../store/store';
import * as api from '../engine/api';
import { userOf } from '../engine/career';
import { averages, f1 } from '../engine/stats';
import { AWARD_LABEL } from '../engine/awards';
import { fmtMoney } from '../engine/contracts';
import { seasonLabel } from '../engine/schedule';
import { legacyScore, legacyTier, hofProbability, careerTotals } from '../engine/legacy';
import { dailyShareText } from '../engine/daily';
import { POS_LABEL } from '../engine/attributes';
import { Card, Kpi, PageHead, flag, natName } from '../ui/common';
import { Icon } from '../ui/icons';
import { Avatar } from '../ui/PlayerCard';
import type { Career } from '../engine/types';

export function drawCard(c: Career): string {
  const u = userOf(c);
  const r = c.retirement!;
  const a = averages(r.totals);
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1c2027');
  grad.addColorStop(1, '#0b0c0e');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,107,26,0.18)';
  g.beginPath();
  g.arc(W - 60, 90, 300, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.04)';
  g.font = '800 520px "Barlow Condensed", Arial Narrow, sans-serif';
  g.textAlign = 'right';
  g.fillText(String(c.profile.number), W + 20, H - 120);
  g.textAlign = 'left';
  g.fillStyle = '#ff6b1a';
  g.font = '700 34px "Barlow Condensed", Arial Narrow, sans-serif';
  g.fillText('NBA LEGACY · CARRERA COMPLETA', 72, 110);
  g.fillStyle = '#b0b6c1';
  g.font = '600 44px "Barlow Condensed", Arial Narrow, sans-serif';
  g.fillText(u.first.toUpperCase(), 72, 200);
  g.fillStyle = '#f4f5f7';
  g.font = '800 128px "Barlow Condensed", Arial Narrow, sans-serif';
  g.fillText(u.last.toUpperCase().slice(0, 14), 68, 320);
  g.fillStyle = '#b0b6c1';
  g.font = '500 36px Inter, system-ui, sans-serif';
  g.fillText(`${natName(u.nat)} · ${POS_LABEL[u.pos]} · #${c.profile.number}`, 72, 380);
  g.fillText(`Retirado a los ${r.age} años · ${seasonLabel(r.season)}`, 72, 428);
  const box = (x: number, y: number, label: string, value: string, color = '#f4f5f7') => {
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.strokeStyle = 'rgba(255,255,255,0.1)';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(x, y, 300, 150, 18);
    g.fill();
    g.stroke();
    g.fillStyle = color;
    g.font = '800 72px "Barlow Condensed", Arial Narrow, sans-serif';
    g.fillText(value, x + 26, y + 88);
    g.fillStyle = '#767d8a';
    g.font = '600 24px Inter, system-ui, sans-serif';
    g.fillText(label.toUpperCase(), x + 28, y + 128);
  };
  box(72, 500, 'Puntos por partido', f1(a.ppg), '#ff9147');
  box(390, 500, 'Rebotes', f1(a.rpg));
  box(708, 500, 'Asistencias', f1(a.apg));
  box(72, 670, 'Partidos NBA', String(r.totals.gp));
  box(390, 670, 'OVR máximo', String(r.peakOvr));
  box(708, 670, 'Anillos', String(r.titles), '#f5c451');
  g.fillStyle = '#f4f5f7';
  g.font = '700 40px "Barlow Condensed", Arial Narrow, sans-serif';
  g.fillText('PALMARÉS', 72, 900);
  g.font = '500 32px Inter, system-ui, sans-serif';
  g.fillStyle = '#b0b6c1';
  const awards = Object.entries(r.awards).filter(([k]) => k !== 'champion').sort((x, y) => y[1] - x[1]).slice(0, 6);
  (awards.length ? awards : [['—', 0] as [string, number]]).forEach(([k, n], i) => g.fillText(k === '—' ? 'Sin premios individuales' : `${n}× ${AWARD_LABEL[k] ?? k}`, 72 + (i % 2) * 480, 960 + Math.floor(i / 2) * 50));
  g.fillStyle = '#ff6b1a';
  g.font = '800 96px "Barlow Condensed", Arial Narrow, sans-serif';
  g.fillText(String(r.legacyScore), 72, 1200);
  g.fillStyle = '#f4f5f7';
  g.font = '700 40px "Barlow Condensed", Arial Narrow, sans-serif';
  g.fillText('LEGACY SCORE', 72 + g.measureText(String(r.legacyScore)).width + 120, 1160);
  g.fillStyle = '#b0b6c1';
  g.font = '500 30px Inter, system-ui, sans-serif';
  g.fillText(r.tier, 72, 1260);
  g.fillText(`Hall of Fame: ${Math.round(r.hofProbability * 100)}%`, 640, 1260);
  return cv.toDataURL('image/png');
}

export function Retirement() {
  const c = useCareer()!;
  const nav = useNavigate();
  const u = userOf(c);
  const r = c.retirement;
  if (!r) {
    const score = legacyScore(c);
    return (
      <>
        <PageHead eyebrow="Retirada" title="Aún en activo" desc="Tu carrera sigue en marcha. Aquí verás el resumen final cuando decidas colgar las botas." />
        <div className="grid g3">
          <Card title="Legado provisional" icon="trophy"><div className="kpis"><Kpi v={score} l="Legacy Score" tone="accent" /><Kpi v={`${Math.round(hofProbability(score) * 100)}%`} l="Opciones de HOF" /></div><p className="small muted" style={{ marginTop: 10 }}>{legacyTier(score)}</p></Card>
          <Card title="Retirarse" icon="flag" className="span2">
            <p className="small muted">Puedes retirarte durante la temporada baja a partir de los 30 años, o antes si no tienes ofertas.</p>
            {c.phase === 'offseason' && (u.age >= 30 || (api.needsContract(c) && c.offers.length === 0)) && <button className="btn danger" style={{ marginTop: 12 }} onClick={() => { if (confirm('¿Anunciar la retirada?')) store.act((x) => api.retire(x, 'Retirada voluntaria.')); }}>Anunciar la retirada</button>}
          </Card>
        </div>
      </>
    );
  }
  const a = averages(r.totals);
  const download = () => {
    const url = drawCard(c);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nba-legacy-${u.last.toLowerCase()}.png`;
    link.click();
  };
  const awardsLine = Object.entries(r.awards).filter(([k]) => k !== 'champion').slice(0, 4).map(([k, n]) => `${n}× ${AWARD_LABEL[k] ?? k}`).join(' · ');
  const share = async () => {
    const text = c.mode === 'daily' && c.dailyKey
      ? dailyShareText(c.dailyKey, `${u.first} ${u.last}`, r.legacyScore, r.tier, [`${r.totals.gp} PJ · ${f1(a.ppg)}/${f1(a.rpg)}/${f1(a.apg)} · ${r.titles} anillo(s)`, awardsLine].filter(Boolean))
      : `🏀 NBA Legacy\n${u.first} ${u.last} (${u.pos}, ${natName(u.nat)})\n${c.seasons.filter((s) => s.comp === 'NBA').length} temporadas · ${r.totals.gp} PJ · ${f1(a.ppg)} PTS ${f1(a.rpg)} REB ${f1(a.apg)} AST\n${r.titles} anillo(s)${awardsLine ? ' · ' + awardsLine : ''}\nLegacy Score ${r.legacyScore} · ${r.tier}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        store.toast('Resumen copiado al portapapeles.');
      }
    } catch {
      /* cancelled */
    }
  };
  const nbaTeams = [...new Set(c.seasons.filter((s) => s.comp === 'NBA' && s.teamId).map((s) => s.teamId!))];
  return (
    <>
      <PageHead eyebrow="Retirada y resumen final" title={`${u.first} ${u.last}`} desc={`${r.reason} ${r.tier}.`}>
        <button className="btn" onClick={share}><Icon name="share" /> Compartir</button>
        <button className="btn primary" onClick={download}><Icon name="download" /> Descargar tarjeta</button>
      </PageHead>
      <div className="grid two-col-l">
        <div className="pcard pop" data-num={c.profile.number} style={{ ['--team' as string]: '#ff6b1a' }}>
          <div className="pcard-top" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Avatar skin={c.profile.look.skin} hair={c.profile.look.hair} color={c.profile.look.accent} number={c.profile.number} size={120} />
            <div className="pname">{flag(u.nat)} <small style={{ display: 'inline' }}>{u.first}</small><br />{u.last}</div>
            <div className="small muted">{POS_LABEL[u.pos]} · Retirado a los {r.age} · {seasonLabel(r.season)}</div>
          </div>
          <div className="pmeta">
            <div><small>Legacy</small><b className="accent">{r.legacyScore}</b></div>
            <div><small>OVR máx.</small><b>{r.peakOvr}</b></div>
            <div><small>Anillos</small><b className="gold">{r.titles}</b></div>
          </div>
          <div className="divider" />
          <div className="small" style={{ position: 'relative' }}><b>Hall of Fame:</b> {Math.round(r.hofProbability * 100)}%<div className="tiny muted">{r.hofVerdict}</div></div>
        </div>
        <div className="stack">
          <Card title="Números de carrera (NBA)" icon="chart">
            <div className="kpis">
              <Kpi v={c.seasons.filter((s) => s.comp === 'NBA' && s.stats.gp).length} l="Temporadas" />
              <Kpi v={r.totals.gp} l="Partidos" />
              <Kpi v={r.totals.pts.toLocaleString('es')} l="Puntos" tone="accent" />
              <Kpi v={(r.totals.oreb + r.totals.dreb).toLocaleString('es')} l="Rebotes" />
              <Kpi v={r.totals.ast.toLocaleString('es')} l="Asistencias" />
              <Kpi v={<span style={{ fontSize: '1.35rem' }}>{f1(a.ppg)} · {f1(a.rpg)} · {f1(a.apg)}</span>} l="PTS · REB · AST" />
              <Kpi v={r.playoffTotals.gp} l="PJ playoffs" />
              <Kpi v={fmtMoney(r.earnings)} l="Ganancias" tone="gold" />
            </div>
          </Card>
          <div className="grid g2">
            <Card title="Palmarés" icon="trophy">
              {Object.keys(r.awards).length === 0 ? <p className="small muted">Sin premios: una carrera de trabajo silencioso.</p> : (
                <div className="row wrap" style={{ gap: 8 }}>{Object.entries(r.awards).map(([k, n]) => <span key={k} className="chip gold">{n}× {AWARD_LABEL[k] ?? k}</span>)}</div>
              )}
            </Card>
            <Card title="Equipos" icon="people">
              <p className="small"><b>Mejor nivel:</b> {r.bestTeam}</p>
              <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>{nbaTeams.map((id) => <span key={id} className="chip"><span className="team-dot" style={{ background: c.league.teams[id].color }} />{c.league.teams[id].name}</span>)}</div>
              {nbaTeams.length === 0 && <p className="small muted">No llegó a jugar en la NBA.</p>}
            </Card>
          </div>
          <div className="row wrap">
            <button className="btn primary lg" onClick={() => nav('/new')}><Icon name="star" /> Nueva carrera</button>
            <button className="btn lg" onClick={() => nav('/history')}>Ver trayectoria</button>
            {c.mode === 'daily' && <button className="btn lg" onClick={() => nav('/daily')}>Desafío diario</button>}
          </div>
          <p className="tiny dim">Totales de carrera NBA: {careerTotals(c).td} triples-dobles · {careerTotals(c).dd} dobles-dobles.</p>
        </div>
      </div>
    </>
  );
}
