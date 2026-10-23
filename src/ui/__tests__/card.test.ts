import { medalSlots } from '../card';

test('medalSlots devuelve una posición por medalla', () => {
  expect(medalSlots(0)).toEqual([]);
  const one = medalSlots(1);
  expect(one).toHaveLength(1);
  const three = medalSlots(3);
  expect(three).toHaveLength(3);
  expect(new Set(three.map((s) => s.x)).size).toBe(3);
  const many = medalSlots(30);
  expect(many).toHaveLength(30);
  for (const s of many) {
    expect(s.x).toBeGreaterThanOrEqual(72);
    expect(s.x + s.size).toBeLessThanOrEqual(432);
  }
});

test('medalSlots puede usarse con diferente posición inicial (30 medallas)', () => {
  const slots = medalSlots(30, 584, 936);
  expect(slots).toHaveLength(30);
  for (const s of slots) {
    expect(s.x).toBeGreaterThanOrEqual(584);
    expect(s.x + s.size).toBeLessThanOrEqual(1008);
  }
});
