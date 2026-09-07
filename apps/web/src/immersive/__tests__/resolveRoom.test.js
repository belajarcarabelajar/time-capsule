import { describe, expect, test } from 'bun:test';
import { resolveRoom } from '../resolveRoom.js';

describe('conservative room selection', () => {
  test.each([
    ['Perang Dunia I', 'Western Front', 'ww1-field-station'],
    [' WORLD WAR I ', 'France', 'ww1-field-station'],
    ['Ｐｅｒａｎｇ Ｄｕｎｉａ １', 'Verdun', 'ww1-field-station'],
    ['WWII', 'London', 'ww2-radio-room'],
    ['Perang Dunia Kedua', 'London', 'ww2-radio-room'],
    ['WWI and WWII', '', 'archive'],
    ['World War II', 'Tokyo', 'archive'],
    ['World War I', 'London', 'archive'],
    ['Majapahit', 'Java', 'archive'],
    ['https://wwii.example.com', '', 'archive'],
    ['awwiiword', '', 'archive'],
    ['WWII', 'unknown island', 'archive'],
    [null, {}, 'archive'],
    ['x'.repeat(501) + ' WWII', '', 'archive'],
  ])('%s / %s -> %s', (topic, location, roomId) => {
    expect(resolveRoom({ topic, location }).roomId).toBe(roomId);
  });
  test('missing input returns archive', () => expect(resolveRoom().roomId).toBe('archive'));
});
