// Public game API used by the UI. Every function mutates the given career (the store passes a clone).
import type { Career, TrainingFocus } from './types';
import { createCareer, userOf, addNews, type NewCareerInput } from './career';
import { advance, type AdvanceUnit, achievementsCheck, inSeason } from './flow';
import { chooseStartingClub, chooseEuroCareer, buildSigningOffers, acceptOffer, beginOffseason, startPreseason, startRegularSeason, predraftDecision, doCombine, answerInterview, revealLottery, runUserDraft, retire, needsContract } from './offseason';
import { resolveEvent, resolveMinigame } from './events';
import { executeTrade, signUser, contractFromOffer } from './market';
import { makeGoal } from './goals';
import { rngFor } from './rng';
import { teamName } from './league';
import { clamp } from './rng';
import { rollChallenge } from './challenges';

export function newCareer(input: NewCareerInput, seed: number): Career {
  const c = createCareer(input, seed);
  if (input.draftedTier === 'lottery') c.flags.tierLottery = 1;
  if (input.draftedTier === 'second') c.flags.tierSecond = 1;
  c.flags.challenge = rollChallenge(seed);
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

/**
 * Simple-mode driver: keeps the career moving (preseason, season, playoffs) until the user
 * really has to decide something: an event, the end-of-season report, a contract, a draft step
 * or retirement. Results are identical to advancing step by step.
 */
export function runUntilDecision(c: Career) {
  for (let i = 0; i < 30; i++) {
    if (c.pendingEvent) return;
    if (c.phase === 'offseason') {
      if ((needsContract(c) && !c.satellite) || c.offers.length) return;
      startPreseason(c);
      continue;
    }
    if (c.phase === 'preseason') {
      startRegularSeason(c);
      continue;
    }
    if (inSeason(c)) {
      const before = `${c.phase}|${c.league.season}|${c.league.day}`;
      advance(c, 'season');
      if (`${c.phase}|${c.league.season}|${c.league.day}` === before) return;
      continue;
    }
    return;
  }
}

/** Result of an interactive minigame played in the UI. */
export function playMinigame(c: Career, made: number) {
  const ev = c.pendingEvent;
  if (!ev?.minigame || ev.resolved) return;
  resolveMinigame(c, userOf(c), Math.max(0, Math.min(ev.minigame.attempts, Math.round(made))), rngFor(c.seed, 'minigame', ev.defId, c.league.season, c.league.day));
  achievementsCheck(c);
}

/**
 * Same as runUntilDecision but in small slices (about two weeks of calendar per call), so the UI can
 * show the season advancing. Returns true once a decision point is reached. Results are identical.
 */
export function runChunk(c: Career): boolean {
  if (c.pendingEvent) return true;
  if (c.phase === 'offseason') {
    if ((needsContract(c) && !c.satellite) || c.offers.length) return true;
    startPreseason(c);
    return false;
  }
  if (c.phase === 'preseason') {
    startRegularSeason(c);
    return false;
  }
  if (inSeason(c)) {
    const before = `${c.phase}|${c.league.season}|${c.league.day}`;
    advance(c, 'week');
    if (c.pendingEvent || !inSeason(c)) return true;
    if (`${c.phase}|${c.league.season}|${c.league.day}` === before) return true;
    advance(c, 'week');
    return !!c.pendingEvent || !inSeason(c);
  }
  return true;
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
  chooseStartingClub, chooseEuroCareer, advance, acceptOffer, beginOffseason, startPreseason, startRegularSeason, predraftDecision, doCombine, answerInterview, revealLottery, runUserDraft, retire, needsContract, signUser, contractFromOffer,
};
export type { AdvanceUnit, NewCareerInput };
