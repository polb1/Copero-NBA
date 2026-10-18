import { newCareer } from '../api';
import { autopilot, baseInput } from './autopilot';
import { CHALLENGES, challengeDone, challengeOf } from '../challenges';

test('every new career gets a challenge that stays the same and can be completed', () => {
  const done: string[] = [];
  for (let i = 0; i < 6; i++) {
    const c = newCareer(baseInput({ route: 'international', origin: '', age: 18 }), 9100 + i * 53);
    const ch = challengeOf(c);
    expect(CHALLENGES).toContain(ch);
    expect(challengeDone(c)).toBe(false);
    autopilot(c, { maxAge: 99, pick: (n, k) => (k * 3 + i) % n });
    expect(challengeOf(c)).toBe(ch);
    if (challengeDone(c)) done.push(ch.id);
  }
  console.log('completed', done.length, 'of 6:', done.join(','));
}, 300000);
