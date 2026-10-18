// Runs the live season simulation off the main thread so the screen never stutters on phones.
// Same engine code as the in-page path, so results are identical.
import type { Career } from './types';
import { runChunk } from './api';

export interface SimProgress {
  phase: Career['phase'];
  season: number;
  day: number;
  step?: string;
}
export type ToWorker = { type: 'start'; career: Career; weeks: number; fast: boolean } | { type: 'fast' };
export type FromWorker = { type: 'progress'; p: SimProgress } | { type: 'done'; career: Career } | { type: 'error'; message: string };

let fast = false;
const post = (m: FromWorker) => (self as unknown as Worker).postMessage(m);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  if (msg.type === 'fast') {
    fast = true;
    return;
  }
  fast = msg.fast;
  const c = msg.career;
  try {
    for (let i = 0; i < 400; i++) {
      // Paced like the in-page animation unless the player skips.
      if (!fast) await wait(30);
      let done = false;
      for (let k = 0; k < (fast ? 4 : 1) && !done; k++) done = runChunk(c, msg.weeks);
      post({ type: 'progress', p: { phase: c.phase, season: c.league.season, day: c.league.day, step: c.predraft?.step } });
      if (done) break;
    }
    post({ type: 'done', career: c });
  } catch (err) {
    post({ type: 'error', message: (err as Error).message });
  }
};
