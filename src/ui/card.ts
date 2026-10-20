// Shareable end-of-career card rendered to a PNG.
import type { Career } from '../engine/types';
import { userOf } from '../engine/career';
import { averages, f1 } from '../engine/stats';
import { AWARD_LABEL } from '../engine/awards';
import { seasonLabel } from '../engine/schedule';
import { POS_LABEL } from '../engine/attributes';
import { fmtMoney, shownValue } from '../engine/contracts';
import { countryByCode } from '../content/names';
import { t } from '../i18n/i18n';

const natName = (code: string) => t(countryByCode(code).name);
const COND = '"Barlow Condensed", Arial Narrow, sans-serif';
const BODY = 'Inter, system-ui, sans-serif';

export function drawCard(c: Career): string {
  const u = userOf(c);
  const r = c.retirement!;
  const a = averages(r.totals);
  // Saves from before the peak was tracked fall back to the value at retirement.
  const peakValue = Math.max(c.flags.peakValue ?? 0, shownValue(c, u));
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
  g.fillStyle = 'rgba(255,255,255,0.04)';
  g.font = `800 520px ${COND}`;
  g.textAlign = 'right';
  g.fillText(String(c.profile.number), W + 20, H - 120);
  g.textAlign = 'left';
  g.fillStyle = '#ff6b1a';
  g.font = `700 34px ${COND}`;
  g.fillText(t('NBA LEGACY · CARRERA COMPLETA'), 72, 110);
  if (u.first) {
    g.fillStyle = '#b0b6c1';
    g.font = `600 44px ${COND}`;
    g.fillText(u.first.toUpperCase(), 72, 200);
  }
  g.fillStyle = '#f4f5f7';
  g.font = `800 128px ${COND}`;
  g.fillText(u.last.toUpperCase().slice(0, 12), 68, 320, 600);
  g.fillStyle = '#b0b6c1';
  g.font = `500 36px ${BODY}`;
  g.fillText(`${natName(u.nat)} · ${t(POS_LABEL[u.pos])} · #${c.profile.number}`, 72, 380, 620);
  g.fillText(t(`Retirado a los ${r.age} años · ${seasonLabel(r.season)}`), 72, 428, 620);

  // Peak OVR, the headline number: a big gold card on the right.
  const hx = 724, hy = 150, hw = 284, hh = 300;
  const gold = g.createLinearGradient(hx, hy, hx + hw, hy + hh);
  gold.addColorStop(0, '#fff3b0');
  gold.addColorStop(0.4, '#f5c451');
  gold.addColorStop(1, '#8a6410');
  g.fillStyle = r.peakOvr >= 80 ? gold : '#ff6b1a';
  g.beginPath();
  g.roundRect(hx, hy, hw, hh, 28);
  g.fill();
  g.fillStyle = '#1a1205';
  g.textAlign = 'center';
  g.font = `700 30px ${COND}`;
  g.fillText(t('OVR MÁXIMO'), hx + hw / 2, hy + 56);
  g.font = `800 190px ${COND}`;
  g.fillText(String(r.peakOvr), hx + hw / 2, hy + 238);
  g.textAlign = 'left';

  const box = (x: number, y: number, label: string, value: string, color = '#f4f5f7') => {
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.strokeStyle = 'rgba(255,255,255,0.1)';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(x, y, 300, 150, 18);
    g.fill();
    g.stroke();
    g.fillStyle = color;
    g.font = `800 72px ${COND}`;
    g.fillText(value, x + 26, y + 88, 250);
    g.fillStyle = '#767d8a';
    g.font = `600 24px ${BODY}`;
    g.fillText(t(label).toUpperCase(), x + 28, y + 128, 250);
  };
  box(72, 500, 'Puntos por partido', f1(a.ppg), '#ff9147');
  box(390, 500, 'Rebotes', f1(a.rpg));
  box(708, 500, 'Asistencias', f1(a.apg));
  box(72, 670, 'Partidos NBA', String(r.totals.gp));
  box(390, 670, 'Valor máximo', fmtMoney(peakValue), '#86efac');
  box(708, 670, 'Anillos', String(r.titles), '#f5c451');
  g.fillStyle = '#f4f5f7';
  g.font = `700 40px ${COND}`;
  g.fillText(t('PALMARÉS'), 72, 900);
  g.font = `500 32px ${BODY}`;
  g.fillStyle = '#b0b6c1';
  const awards = Object.entries(r.awards).filter(([k]) => k !== 'champion').sort((x, y) => y[1] - x[1]).slice(0, 6);
  (awards.length ? awards : [['—', 0] as [string, number]]).forEach(([k, n], i) => g.fillText(k === '—' ? t('Sin premios individuales') : `${n}× ${t(AWARD_LABEL[k] ?? k)}`, 72 + (i % 2) * 480, 960 + Math.floor(i / 2) * 50, 460));
  g.fillStyle = '#ff6b1a';
  g.font = `800 96px ${COND}`;
  g.fillText(String(r.legacyScore), 72, 1200);
  g.fillStyle = '#f4f5f7';
  g.font = `700 40px ${COND}`;
  g.fillText('LEGACY SCORE', 72 + g.measureText(String(r.legacyScore)).width + 120, 1160);
  g.fillStyle = '#b0b6c1';
  g.font = `500 30px ${BODY}`;
  g.fillText(t(r.tier), 72, 1260);
  g.fillText(`Hall of Fame: ${Math.round(r.hofProbability * 100)}%`, 640, 1260);
  return cv.toDataURL('image/png');
}
