// Scene kind → icon glyph map (step 4.1b). Pure data, no emoji.
import type { IconName } from '../icons';
import type { SceneKind } from './types';

export const SCENE_GLYPH: Record<SceneKind, IconName> = {
  arena: 'ball',
  training: 'dumbbell',
  locker: 'locker',
  coach: 'clipboard',
  press: 'mic',
  medical: 'med',
  contract: 'contract',
  money: 'coin',
  sneakers: 'shoe',
  phone: 'phone',
  trophy: 'trophy',
  draft: 'cap',
  travel: 'plane',
  national: 'globe',
  summer: 'sun',
  family: 'home',
  clutch: 'stopwatch',
  contest: 'target',
  college: 'book',
  europe: 'globe',
  rest: 'bed',
  rivalry: 'swords',
};
