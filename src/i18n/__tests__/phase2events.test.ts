import { EN } from '../en';
import { CA } from '../ca';
import { EVENTS } from '../../content/events';

/** Minigame events added in phase 2: their title, intro and three outcomes must be translated. */
const PHASE2_EVENT_IDS = ['mg-spotlight', 'mg-dunk', 'mg-boards', 'mg-steal', 'mg-pass', 'mg-close'] as const;

const DICTS: [string, Record<string, string>][] = [
  ['EN', EN],
  ['CA', CA],
];

const OUTCOME_KEYS = ['great', 'ok', 'fail'] as const;

describe('phase 2 minigame events', () => {
  test('every phase 2 event exists', () => {
    for (const id of PHASE2_EVENT_IDS) {
      const event = EVENTS.find((e) => e.id === id);
      expect(event, `missing event ${id}`).toBeTruthy();
    }
  });

  test('every phase 2 event has its title, text and 3 outcome texts translated', () => {
    for (const id of PHASE2_EVENT_IDS) {
      const event = EVENTS.find((e) => e.id === id);
      expect(event, `missing event ${id}`).toBeTruthy();
      if (!event) continue;

      expect(event.title, `${id}: missing title`).toBeTruthy();
      expect(event.text, `${id}: missing text`).toBeTruthy();
      expect(event.minigame, `${id}: missing minigame`).toBeTruthy();
      if (!event.minigame) continue;

      for (const [name, dict] of DICTS) {
        expect(dict[event.title], `${name}: missing title "${event.title}"`).toBeTruthy();
        expect(dict[event.text], `${name}: missing text of ${id}`).toBeTruthy();

        for (const outcome of OUTCOME_KEYS) {
          const raw = event.minigame.outcomes[outcome]?.text;
          expect(raw, `${id}: missing ${outcome}.text`).toBeTruthy();
          expect(dict[raw], `${name}: missing ${outcome}.text of ${id}`).toBeTruthy();
        }
      }
    }
  });

  test('translated events keep the {coach} and {opp} placeholders', () => {
    for (const id of PHASE2_EVENT_IDS) {
      const event = EVENTS.find((e) => e.id === id);
      expect(event, `missing event ${id}`).toBeTruthy();
      if (!event || !event.minigame) continue;

      const sources = [
        event.title,
        event.text,
        ...OUTCOME_KEYS.map((o) => event.minigame!.outcomes[o].text),
      ];

      for (const [name, dict] of DICTS) {
        for (const source of sources) {
          const translation = dict[source];
          if (typeof translation !== 'string') continue;
          for (const slot of source.match(/\{[a-zA-Z0-9_]+\}/g) ?? []) {
            expect(translation, `${name}: "${source}" lost ${slot}`).toContain(slot);
          }
        }
      }
    }
  });
});
