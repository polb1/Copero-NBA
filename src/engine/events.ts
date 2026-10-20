import type { ActiveEvent, Career, EffectBag, MinigameSpec, Player, Team } from './types';
import { shiftOvr } from './progression';
import { cashOf } from './mindset';
import { EVENTS, type EventDef, type EventWhen, type RoleKey, type EventOutcome, type MinigameDef } from '../content/events';
import { countryByCode } from '../content/names';
import { attrLabel } from './attributes';
import { yearsLeft, fmtMoney } from './contracts';
import { refreshOvr, fullName } from './players';
import { rollInjury } from './injuries';
import { clamp, type Rng } from './rng';

export interface EventContext {
  career: Career;
  user: Player;
  team: Team | null;
  role: RoleKey;
  absDay: number;
}

export const absDay = (season: number, day: number) => season * 1000 + day;

function teamWinPct(t: Team | null) {
  return t && t.w + t.l >= 8 ? t.w / (t.w + t.l) : 0.5;
}

export function matches(w: EventWhen, ctx: EventContext, viaChain = false): boolean {
  const { career: c, user: u, team, role } = ctx;
  if (w.chainOnly && !viaChain) return false;
  if (w.phases && !w.phases.includes(c.phase)) return false;
  if (w.minAge !== undefined && u.age < w.minAge) return false;
  if (w.maxAge !== undefined && u.age > w.maxAge) return false;
  if (w.minOvr !== undefined && u.ovr < w.minOvr) return false;
  if (w.maxOvr !== undefined && u.ovr > w.maxOvr) return false;
  if (w.roles && !w.roles.includes(role)) return false;
  if (w.minTrust !== undefined && c.trust < w.minTrust) return false;
  if (w.maxTrust !== undefined && c.trust > w.maxTrust) return false;
  if (w.minMorale !== undefined && c.morale < w.minMorale) return false;
  if (w.maxMorale !== undefined && c.morale > w.maxMorale) return false;
  if (w.minChem !== undefined && c.chemistry < w.minChem) return false;
  if (w.maxChem !== undefined && c.chemistry > w.maxChem) return false;
  if (w.minFame !== undefined && c.fame < w.minFame) return false;
  if (w.maxFame !== undefined && c.fame > w.maxFame) return false;
  if (w.minPressure !== undefined && c.pressure < w.minPressure) return false;
  if (w.minRep !== undefined && c.reputation < w.minRep) return false;
  if (w.minFatigue !== undefined && u.fatigue < w.minFatigue) return false;
  if (w.minForm !== undefined && u.form < w.minForm) return false;
  if (w.maxForm !== undefined && u.form > w.maxForm) return false;
  if (w.injured !== undefined && !!u.injury !== w.injured) return false;
  if (w.severity && (!u.injury || !w.severity.includes(u.injury.severity))) return false;
  if (w.flags && !w.flags.every((f) => c.flags[f])) return false;
  if (w.notFlags && w.notFlags.some((f) => c.flags[f])) return false;
  const comp = !u.teamId ? (c.satellite?.comp ?? 'NBA') : c.assignment === 'GLG' ? 'GLG' : 'NBA';
  if (w.comp && !w.comp.includes(comp)) return false;
  if (w.nba && (comp !== 'NBA' || !u.teamId)) return false;
  if (w.contract) {
    const k = u.contract;
    if (!k) return false;
    if (w.contract === 'expiring' && yearsLeft(k, c.league.season) !== 1) return false;
    if (w.contract === 'rookie' && k.kind !== 'rookie') return false;
    if (w.contract === 'two-way' && k.kind !== 'two-way') return false;
    if (w.contract === 'long' && yearsLeft(k, c.league.season) < 3) return false;
  }
  if (w.teamStatus && (!team || !w.teamStatus.includes(team.status))) return false;
  if (w.teamWinning && teamWinPct(team) < 0.55) return false;
  if (w.teamLosing && teamWinPct(team) > 0.45) return false;
  if (w.minYearsPro !== undefined && u.yearsPro < w.minYearsPro) return false;
  if (w.maxYearsPro !== undefined && u.yearsPro > w.maxYearsPro) return false;
  if (w.beforeDeadline && (c.phase !== 'regular' || c.league.day > c.league.deadlineDay)) return false;
  return true;
}

export function eligibleEvents(ctx: EventContext): EventDef[] {
  const c = ctx.career;
  return EVENTS.filter((e) => {
    if (e.weight <= 0) return false;
    const last = c.eventHistory[e.id];
    if (last !== undefined) {
      if (e.once) return false;
      const seen = c.flags['seen:' + e.id] ?? 1;
      if (ctx.absDay - last < (e.cooldown ?? 300) * (1 + 0.5 * (seen - 1))) return false;
    }
    return matches(e.when, ctx);
  });
}

export function pickEvent(ctx: EventContext, rng: Rng): EventDef | null {
  const list = eligibleEvents(ctx);
  if (!list.length) return null;
  const maxP = Math.max(...list.map((e) => e.priority ?? 0));
  const top = list.filter((e) => (e.priority ?? 0) === maxP);
  // Prefer events never seen in this career to keep variety high.
  return rng.weighted(top, (e) => (e.weight * (ctx.career.eventHistory[e.id] === undefined ? 1.6 : 1)) / (1 + (ctx.career.flags['seen:' + e.id] ?? 0)));
}

export function markEventSeen(c: Career, id: string, day: number) {
  c.eventHistory[id] = day;
  c.flags['seen:' + id] = (c.flags['seen:' + id] ?? 0) + 1;
}

function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? k);
}

export function eventVars(ctx: EventContext, rng: Rng): Record<string, string> {
  const { career: c, user: u, team } = ctx;
  const league = c.league;
  const mates = team ? team.roster.map((id) => league.players[id]).filter((p) => p && !p.isUser) : [];
  const vet = [...mates].sort((a, b) => b.age - a.age)[0];
  const others = Object.values(league.players).filter((p) => p.teamId && p.teamId !== u.teamId && p.pos === u.pos && p.ovr >= u.ovr - 6);
  const rival = others.length ? rng.pick(others) : null;
  return {
    team: team ? `${team.city} ${team.name}` : c.satellite?.teamName ?? 'tu equipo',
    city: team?.city ?? 'tu ciudad',
    coach: team?.coach.name ?? 'Tu entrenador',
    teammate: mates.length ? fullName(rng.pick(mates)) : 'Un compañero',
    vet: vet ? fullName(vet) : 'un veterano',
    rival: rival ? fullName(rival) : 'Un rival',
    agent: c.agent.name,
    country: countryByCode(u.nat).name,
    injury: u.injury?.name ?? 'una lesión',
    opp: (() => {
      const ids = Object.keys(league.teams).filter((id) => id !== u.teamId);
      const t = league.teams[rng.pick(ids)];
      return `${t.city} ${t.name}`;
    })(),
  };
}

/** Shot-meter parameters: better shooters get a wider green zone; pressure narrows it and speeds it up. */
export function minigameSpec(def: MinigameDef, u: Player, c: Career): MinigameSpec {
  const skill = def.attrs.reduce((s, k) => s + u.attrs[k], 0) / def.attrs.length;
  const nerves = def.pressure * (1 - (c.morale - 50) / 200) * (1 + c.pressure / 200);
  const zone = clamp(7 + (skill - 50) * 0.32 - nerves * 6 + u.form * 0.25, 5, 26);
  const speed = clamp(0.55 + def.pressure * 0.5, 0.5, 1.1);
  return {
    kind: def.kind,
    attempts: def.attempts,
    zone: Math.round(zone * 10) / 10,
    speed: Math.round(speed * 100) / 100,
    autoProb: clamp(0.2 + zone * 0.026, 0.2, 0.88),
    great: def.great,
    ok: def.ok,
  };
}

function optionCost(o: EventDef['options'][number]): number {
  const spends = [o.effects?.money ?? 0, ...(o.outcomes ?? []).map((x) => x.effects.money ?? 0)];
  return Math.max(0, ...spends.map((m) => -m));
}

/** Rough value of an outcome for the player: positive is "it went well". */
function outcomeValue(e: EffectBag): number {
  let v = (e.trust ?? 0) + (e.morale ?? 0) + (e.chemistry ?? 0) + (e.reputation ?? 0) + (e.fame ?? 0) + (e.loyalty ?? 0) + (e.workEthic ?? 0);
  v += -(e.pressure ?? 0) * 0.5 - (e.fatigue ?? 0) * 0.3 + (e.form ?? 0) * 2 + (e.money ?? 0) / 100_000 + (e.endorsement ?? 0) / 50_000 + (e.pot ?? 0) * 5 + (e.ovr ?? 0) * 8;
  v += Object.values(e.attrs ?? {}).reduce((s, x) => s + (x ?? 0) * 2, 0);
  v += (e.heal ?? 0) / 5 - (e.injuryRisk ?? 0) * 15;
  if (e.injure) v -= e.injure === 'grave' ? 60 : e.injure === 'moderada' ? 30 : 12;
  if (e.trophy) v += 20;
  return v;
}

/** Chance (%) that a risky option goes well, with the same weights the resolution uses. */
function optionOdds(o: EventDef['options'][number], ctx: EventContext): number | undefined {
  if (!o.outcomes || o.outcomes.length < 2) return undefined;
  const w = o.outcomes.map((x) => Math.max(0.05, x.weight + (x.boost ? statFor(ctx.career, ctx.user, x.boost.stat) * x.boost.per : 0)));
  const total = w.reduce((a, b) => a + b, 0);
  const good = o.outcomes.reduce((s, x, i) => s + (outcomeValue(x.effects) > 0 ? w[i] : 0), 0);
  const pct = Math.round((good / total) * 100);
  return pct > 0 && pct < 100 ? pct : undefined;
}

export function instantiate(def: EventDef, ctx: EventContext, rng: Rng): ActiveEvent {
  const vars = eventVars(ctx, rng);
  const ev: ActiveEvent = {
    defId: def.id,
    category: def.category,
    title: fill(def.title, vars),
    text: fill(def.text, vars),
    // An option that spends money needs it up front: its largest possible cost.
    options: def.options.map((o) => ({ label: fill(o.label, vars), desc: fill(o.desc, vars), cost: optionCost(o) || undefined, odds: optionOdds(o, ctx) })),
    vars,
  };
  if (def.minigame) {
    ev.minigame = minigameSpec(def.minigame, ctx.user, ctx.career);
    // Single fallback option: let the engine shoot for you (accessibility, autopilot, impatience).
    ev.options = [{ label: 'Simular el lanzamiento', desc: 'Decide tu nivel de tiro, sin jugar.' }];
  }
  return ev;
}

/** Applies a played (or simulated) minigame result. */
export function resolveMinigame(c: Career, u: Player, made: number, rng: Rng, simulated = false) {
  const ev = c.pendingEvent!;
  const def = EVENTS.find((e) => e.id === ev.defId)!;
  const mg = def.minigame!;
  const tier = made >= mg.great ? 'great' : made >= mg.ok ? 'ok' : 'fail';
  const o = mg.outcomes[tier];
  const summary = applyEffects(c, u, o.effects, rng);
  const score = `${made}/${mg.attempts}`;
  ev.resolved = { option: simulated ? 0 : -1, made, result: `${score} — ${fill(o.text, ev.vars)}`, effectsSummary: summary };
  c.decisions.push({ season: c.league.season, title: ev.title, choice: `${simulated ? 'Simulado' : 'Jugado'}: ${score}` });
  return { text: ev.resolved.result, summary };
}

function statFor(c: Career, u: Player, s: NonNullable<EventOutcome['boost']>['stat']) {
  if (s === 'ovr') return u.ovr - 70;
  const v = { trust: c.trust, fame: c.fame, workEthic: c.workEthic, chemistry: c.chemistry, reputation: c.reputation, morale: c.morale }[s];
  return v - 50;
}

const SIGN = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Agencies: commission on every salary vs. contacts that raise the contract offers. */
const AGENCY = {
  top: { cut: 6, quality: 85, note: 'Mejores ofertas de contrato' },
  family: { cut: 4, quality: 55, note: 'Ofertas de contrato normales' },
  self: { cut: 0, quality: 25, note: 'Ofertas de contrato más bajas' },
} as const;

/** Applies an effect bag to career + player. Returns human-readable summary lines. */
export function applyEffects(c: Career, u: Player, e: EffectBag, rng: Rng): string[] {
  const out: string[] = [];
  const bump = (key: 'trust' | 'morale' | 'chemistry' | 'reputation' | 'fame' | 'pressure' | 'loyalty' | 'workEthic', label: string) => {
    const v = e[key];
    if (!v) return;
    c[key] = clamp(c[key] + v, 0, 100);
    out.push(`${label} ${SIGN(v)}`);
  };
  bump('trust', 'Confianza del entrenador');
  bump('morale', 'Moral');
  bump('chemistry', 'Química');
  bump('reputation', 'Reputación');
  bump('fame', 'Popularidad');
  bump('pressure', 'Presión mediática');
  bump('loyalty', 'Lealtad');
  bump('workEthic', 'Ética de trabajo');
  if (e.fatigue) {
    u.fatigue = clamp(u.fatigue + e.fatigue, 0, 100);
    out.push(`Fatiga ${SIGN(e.fatigue)}`);
  }
  if (e.form) {
    u.form = clamp(u.form + e.form, -10, 10);
    out.push(`Forma ${SIGN(e.form)}`);
  }
  if (e.money) {
    // Income counts towards career earnings; costs come out of the wallet only.
    c.cash = cashOf(c) + e.money;
    if (e.money > 0) c.earnings += e.money;
    out.push(`Dinero ${e.money > 0 ? '+' : '−'}${fmtMoney(Math.abs(e.money))}`);
  }
  if (e.agent) {
    const deal = AGENCY[e.agent];
    c.agent = { ...c.agent, quality: deal.quality };
    c.flags.agentCut = deal.cut;
    if (e.agent === 'top') c.flags.agentUpgrade = 1;
    out.push(`Comisión del agente ${deal.cut} %`, deal.note);
  }
  if (e.endorsement) {
    c.endorsement = Math.max(0, c.endorsement + e.endorsement);
    out.push(`Patrocinios ${e.endorsement > 0 ? '+' : '−'}${fmtMoney(Math.abs(e.endorsement))}/año`);
  }
  if (e.ovr) {
    const before = u.ovr;
    shiftOvr(u, e.ovr, rng);
    const d = u.ovr - before;
    if (d) out.push(`OVR ${SIGN(d)}`);
  }
  if (e.pot) {
    u.pot = clamp(u.pot + e.pot, u.ovr, 99);
    out.push(`Potencial ${SIGN(e.pot)}`);
  }
  if (e.attrs) {
    for (const [k, v] of Object.entries(e.attrs)) {
      if (!v) continue;
      const key = k as keyof typeof u.attrs;
      u.attrs[key] = clamp(u.attrs[key] + v, 20, 99);
      out.push(`${attrLabel(key)} ${SIGN(v)}`);
    }
    refreshOvr(u);
  }
  if (e.flag) c.flags[e.flag] = 1;
  if (e.flag === 'nationalTeam') c.flags.nationalCaps = (c.flags.nationalCaps ?? 0) + 1;
  if (e.flag === 'medal') c.flags.medals = (c.flags.medals ?? 0) + 1;
  if (e.trophy) {
    c.flags[`trophy:${e.trophy}:${c.league.season}`] = 1;
    out.push('Trofeo: concurso de triples');
  }
  if (e.unflag) delete c.flags[e.unflag];
  if (e.chain) c.eventQueue.push({ id: e.chain.id, season: c.league.season, day: c.league.day + e.chain.inDays });
  if (e.injuryRisk) c.flags.injuryRisk = clamp((c.flags.injuryRisk ?? 0) + e.injuryRisk, 0, 3);
  if (e.tradeRequest) {
    c.tradeRequested = true;
    out.push('Petición de traspaso registrada');
  }
  const sev = { leve: 1, moderada: 2, grave: 3 } as const;
  if (e.injure && (!u.injury || sev[e.injure] > sev[u.injury.severity])) {
    u.injury = rollInjury(rng, e.injure);
    out.push(`Lesión: ${u.injury.name}`);
  }
  if (e.heal && u.injury) {
    const delta = Math.round((u.injury.daysLeft * e.heal) / 100);
    u.injury.daysLeft = Math.max(1, u.injury.daysLeft - delta);
    out.push(e.heal > 0 ? `Recuperación −${delta} días` : `Recuperación +${-delta} días`);
  }
  if (e.playThrough && u.injury) {
    u.injury.playingThrough = true;
    out.push('Jugarás con molestias');
  }
  if (e.gleague && u.contract && c.assignment !== 'GLG') {
    c.assignment = 'GLG';
    out.push('Asignado a la G League');
  }
  if (e.recall && c.assignment === 'GLG') {
    c.assignment = 'NBA';
    out.push('Recuperado por el equipo NBA');
  }
  return out;
}

export function resolveEvent(c: Career, u: Player, optionIndex: number, rng: Rng): { text: string; summary: string[] } {
  const ev = c.pendingEvent!;
  const def = EVENTS.find((e) => e.id === ev.defId)!;
  if (def.minigame && ev.minigame) {
    const made = rng.binomial(ev.minigame.attempts, ev.minigame.autoProb);
    return resolveMinigame(c, u, made, rng, true);
  }
  const opt = def.options[optionIndex];
  let effects: EffectBag = opt.effects ?? {};
  let text = opt.text ?? '';
  let lucky: boolean | undefined;
  if (opt.outcomes) {
    const o = rng.weighted(opt.outcomes, (x) => Math.max(0.05, x.weight + (x.boost ? statFor(c, u, x.boost.stat) * x.boost.per : 0)));
    effects = o.effects;
    text = o.text;
    lucky = outcomeValue(o.effects) > 0;
  }
  const summary = applyEffects(c, u, effects, rng);
  const filled = fill(text, ev.vars);
  const odds = ev.options[optionIndex].odds;
  ev.resolved = { option: optionIndex, result: filled, effectsSummary: summary, ...(odds !== undefined ? { odds, lucky } : {}) };
  c.decisions.push({ season: c.league.season, title: ev.title, choice: ev.options[optionIndex].label });
  return { text: filled, summary };
}

export const eventById = (id: string) => EVENTS.find((e) => e.id === id);
