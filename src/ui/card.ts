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
import { DIAMOND_OVR } from './simple';

const natName = (code: string) => t(countryByCode(code).name);
const COND = '"Barlow Condensed", Arial Narrow, sans-serif';
const BODY = 'Inter, system-ui, sans-serif';

/** Posiciones de todas las medallas de selección, ajustadas para que quepan en la tarjeta. */
export function medalSlots(count: number, startX = 72, y = 829): { x: number; y: number; size: number }[] {
  const n = Math.max(0, Math.floor(count));
  if (!n) return [];
  const size = Math.max(6, Math.min(32, Math.floor(360 / n) - 4));
  return Array.from({ length: n }, (_, i) => ({ x: startX + i * (size + 4), y, size }));
}

/**
 * Dibuja `text` dentro de `maxWidth`: reduce el tamaño de fuente (hasta `minFontSize`) y,
 * si aún no cabe, recorta el texto con `…`. Conserva peso y familia de `g.font`.
 */
function fitText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  minFontSize = 20,
): string {
  const baseFont = g.font;
  const baseSize = Math.max(minFontSize, Math.floor(Number(/(\d+(?:\.\d+)?)px/.exec(baseFont)?.[1] ?? minFontSize)));
  const fontAt = (px: number) => baseFont.replace(/\d+(?:\.\d+)?px/, `${px}px`);
  const draw = (value: string, px: number) => {
    g.font = fontAt(px);
    g.fillText(value, x, y);
    g.font = baseFont;
    return value;
  };

  for (let px = baseSize; px >= minFontSize; px--) {
    g.font = fontAt(px);
    if (g.measureText(text).width <= maxWidth) return draw(text, px);
  }

  g.font = fontAt(minFontSize);
  for (let i = text.length - 1; i > 0; i--) {
    const cut = text.slice(0, i).trimEnd() + '…';
    if (g.measureText(cut).width <= maxWidth) return draw(cut, minFontSize);
  }
  return draw('…', minFontSize);
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  if (typeof g.roundRect === 'function') { g.roundRect(x, y, w, h, r); return; }
  const rr = Math.min(r, w / 2, h / 2);
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

/** Panel translúcido usado por las dos cajas de la zona inferior. */
function drawPanel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.strokeStyle = 'rgba(255,255,255,0.1)';
  g.lineWidth = 2;
  roundRect(g, x, y, w, h, 18);
  g.fill();
  g.stroke();
}

function drawMedal(g: CanvasRenderingContext2D, x: number, y: number, size: number, gold = true): void {
  g.save();
  g.translate(x, y);
  g.scale(size / 100, size / 100);
  // Ribbons.
  g.fillStyle = gold ? '#ff6b1a' : '#5b6472';
  g.beginPath();
  g.moveTo(30, 0);
  g.lineTo(45, 0);
  g.lineTo(54, 38);
  g.lineTo(41, 44);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(70, 0);
  g.lineTo(55, 0);
  g.lineTo(46, 38);
  g.lineTo(59, 44);
  g.closePath();
  g.fill();
  // Disc.
  const disc = g.createLinearGradient(28, 32, 72, 92);
  if (gold) {
    disc.addColorStop(0, '#fff3b0');
    disc.addColorStop(0.45, '#f5c451');
    disc.addColorStop(1, '#8a6410');
  } else {
    disc.addColorStop(0, '#e8ecf1');
    disc.addColorStop(0.45, '#aeb7c4');
    disc.addColorStop(1, '#525a66');
  }
  g.fillStyle = disc;
  g.beginPath();
  g.arc(50, 62, 30, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 2;
  g.stroke();
  // Inner ring.
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(50, 62, 23.5, 0, Math.PI * 2);
  g.stroke();
  // Five-point star.
  g.fillStyle = gold ? '#3a2a08' : '#2b3038';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? 15 : 6.5;
    const px = 50 + Math.cos(a) * r;
    const py = 62 + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  // Gloss.
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 3.5;
  g.beginPath();
  g.arc(50, 62, 20, Math.PI * 1.12, Math.PI * 1.42);
  g.stroke();
  g.restore();
}

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
  const diamond = g.createLinearGradient(hx, hy, hx + hw, hy + hh);
  diamond.addColorStop(0, '#e0f7ff');
  diamond.addColorStop(0.35, '#7dd3fc');
  diamond.addColorStop(0.7, '#38bdf8');
  diamond.addColorStop(1, '#0369a1');
  g.fillStyle = r.peakOvr >= DIAMOND_OVR ? diamond : r.peakOvr >= 80 ? gold : '#ff6b1a';
  roundRect(g, hx, hy, hw, hh, 28);
  g.fill();
  g.fillStyle = r.peakOvr >= DIAMOND_OVR ? '#062a3a' : '#1a1205';
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
    roundRect(g, x, y, 300, 150, 18);
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

  // Lower zone: honors, national team and legacy.
  const medals = c.flags.medals ?? 0;
  const caps = c.flags.nationalCaps ?? 0;

  // Section labels.
  g.fillStyle = '#f4f5f7';
  g.font = `700 40px ${COND}`;
  g.fillText(t('PALMARÉS'), 72, 884);
  g.fillText(t('Selección').toUpperCase(), 560, 884);

  // Two equal panels, ending at y = 1180.
  drawPanel(g, 72, 904, 448, 276);
  drawPanel(g, 560, 904, 448, 276);

  // Individual awards: a single column, at most six rows.
  const awards = Object.entries(r.awards).filter(([k]) => k !== 'champion').sort((x, y) => y[1] - x[1]).slice(0, 6);
  g.fillStyle = '#f4f5f7';
  g.font = `600 30px ${BODY}`;
  if (awards.length) {
    awards.forEach(([k, n], i) => fitText(g, `${n}× ${t(AWARD_LABEL[k] ?? k)}`, 96, 956 + i * 38, 400));
  } else {
    g.fillText(t('Sin premios individuales'), 96, 956);
  }

  // National team: medals on top, totals underneath.
  medalSlots(medals, 584, 936).forEach((s) => drawMedal(g, s.x, s.y, s.size, true));
  g.font = `800 32px ${COND}`;
  g.fillStyle = '#f5c451';
  if (medals > 0) {
    fitText(g, t(`${medals} medalla${medals > 1 ? 's' : ''}`), 584, 1002, 400);
  } else {
    g.fillText('—', 584, 1002);
  }
  if (caps > 0) {
    g.fillStyle = '#b0b6c1';
    g.font = `600 26px ${BODY}`;
    fitText(g, t(`${caps} convocatoria${caps > 1 ? 's' : ''}`), 584, 1048, 400);
  }

  // Legacy score, tier and Hall of Fame odds.
  g.fillStyle = '#ff6b1a';
  g.font = `700 30px ${COND}`;
  g.fillText(t('LEGACY SCORE'), 72, 1192);

  g.fillStyle = '#ff6b1a';
  g.font = `800 120px ${COND}`;
  fitText(g, String(r.legacyScore), 72, 1300, 540);

  g.fillStyle = '#b0b6c1';
  g.font = `600 30px ${BODY}`;
  fitText(g, t(r.tier), 640, 1246, 368);
  fitText(g, `Hall of Fame: ${Math.round(r.hofProbability * 100)}%`, 640, 1300, 368);

  return cv.toDataURL('image/png');
}
