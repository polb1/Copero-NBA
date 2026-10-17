// Public game API used by the UI. Every function mutates the given career (the store passes a clone).
import type { Career, TrainingFocus } from './types';
import { createCareer, userOf, addNews, type NewCareerInput } from './career';
import { advance, type AdvanceUnit, achievementsCheck } from './flow';
import { buildSigningOffers, acceptOffer, beginOffseason, startPreseason, startRegularSeason, predraftDecision, doCombine, answerInterview, revealLottery, runUserDraft, retire, needsContract } from './offseason';
import { resolveEvent } from './events';
import { executeTrade, signUser, contractFromOffer } from './market';
import { makeGoal } from './goals';
import { rngFor } from './rng';
import { teamName } from './league';
import { clamp } from './rng';

export function newCareer(input: NewCareerInput, seed: number): Career {
  const c = createCareer(input, seed);
  if (input.draftedTier === 'lottery') c.flags.tierLottery = 1;
  if (input.draftedTier === 'second') c.flags.tierSecond = 1;
  if (c.phase === 'signing') buildSigningOffers(c);
  return c;
}

export function chooseOption(c: Career, index: number) {
  const ev = c.pendingEvent;
  if (!ev || ev.resolved) return;
  if (ev.defId === 'dyn:trade') {
    const offer = c.offers[index];
    if (offer) {
      executeTrade(c, offer.teamId, 'Se cumple tu deseo de cambiar de aires.');
      ev.resolved = { option: index, result: `Nuevo destino: ${teamName(c.league, offer.teamId)}.`, effectsSummary: ['Confianza del entrenador reiniciada', 'Química −'] };
    } else {
      c.tradeRequested = false;
      c.chemistry = clamp(c.chemistry - 4, 0, 100);
      ev.resolved = { option: index, result: 'Retiras la petición. Toca recomponer la relación con el vestuario.', effectsSummary: ['Química −4'] };
    }
    c.offers = [];
    c.decisions.push({ season: c.league.season, title: ev.title, choice: ev.options[index].label });
    return;
  }
  resolveEvent(c, userOf(c), index, rngFor(c.seed, 'resolve', ev.defId, c.league.season, c.league.day));
  achievementsCheck(c);
}

export function dismissEvent(c: Career) {
  if (c.pendingEvent?.resolved) c.pendingEvent = null;
}

export function setTraining(c: Career, focus: TrainingFocus, intensity: Career['training']['intensity']) {
  c.training = { focus, intensity };
}

export function setGoals(c: Career, ids: string[]) {
  c.goals = ids.slice(0, 2).map(makeGoal);
}

export function requestTrade(c: Career) {
  c.tradeRequested = true;
  c.chemistry = clamp(c.chemistry - 5, 0, 100);
  c.loyalty = clamp(c.loyalty - 10, 0, 100);
  c.trust = clamp(c.trust - 4, 0, 100);
  addNews(c, 'contract', 'Petición de traspaso', 'Has comunicado a la directiva que quieres salir. Las ofertas se estudiarán antes de la fecha límite.', 'neutral');
}

export function demandMinutes(c: Career) {
  const u = userOf(c);
  const rng = rngFor(c.seed, 'demand', c.league.season, c.league.day);
  const ok = rng.chance(clamp(0.25 + (u.ovr - 70) * 0.03 + (c.trust - 50) * 0.01, 0.05, 0.85));
  if (ok) {
    c.trust = clamp(c.trust + 8, 0, 100);
    addNews(c, 'event', 'Reunión con el entrenador', 'El entrenador acepta darte más protagonismo. Ahora toca responder.', 'good');
  } else {
    c.trust = clamp(c.trust - 8, 0, 100);
    c.chemistry = clamp(c.chemistry - 3, 0, 100);
    addNews(c, 'event', 'Reunión con el entrenador', 'La petición de más minutos no sienta bien. Tu rol no cambia.', 'bad');
  }
  c.flags.lastDemand = c.league.season * 1000 + c.league.day;
  return ok;
}

export function setAssignment(c: Career, to: 'NBA' | 'GLG') {
  const u = userOf(c);
  if (!u.contract || u.contract.kind === 'gleague') return;
  c.assignment = to;
  addNews(c, 'contract', to === 'GLG' ? 'Asignado a la G League' : 'De vuelta al primer equipo', to === 'GLG' ? 'Bajas al filial para sumar minutos.' : 'Vuelves a la rotación NBA.', 'neutral');
}

export {
  advance, acceptOffer, beginOffseason, startPreseason, startRegularSeason, predraftDecision, doCombine, answerInterview, revealLottery, runUserDraft, retire, needsContract, signUser, contractFromOffer,
};
export type { AdvanceUnit, NewCareerInput };
