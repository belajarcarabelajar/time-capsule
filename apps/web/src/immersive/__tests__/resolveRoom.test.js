import { describe, expect, test } from 'bun:test';
import { resolveRoom } from '../resolveRoom.js';

describe('conservative room selection', () => {
  test.each([
    ['Perang Dunia I', 'Western Front', 'ww1-field-station'],
    [' WORLD WAR I ', 'France', 'ww1-field-station'],
    ['Ｐｅｒａｎｇ Ｄｕｎｉａ １', 'Verdun', 'ww1-field-station'],
    ['World War I', 'Flanders', 'ww1-field-station'],
    ['WWI', 'Front occidental', 'ww1-field-station'],
    ['WWII', 'London', 'ww2-radio-room'],
    ['Perang Dunia Kedua', 'London', 'ww2-radio-room'],
    ['World War II', 'British home front', 'ww2-radio-room'],
    ['WWI and WWII', '', 'archive'],
    ['World War II', 'Tokyo', 'archive'],
    ['World War I', 'London', 'archive'],
    ['Majapahit', 'Java', 'archive'],
    ['Sriwijaya', 'Palembang, Sumatra', 'market-port'],
    ['Jalur rempah', '', 'market-port'],
    ['Perdagangan maritim', 'Batavia', 'market-port'],
    ['Sriwijaya', 'Palembang', 'market-port'],
    ['Pasar dan pelabuhan', 'Sunda Kelapa', 'market-port'],
    ['Kehidupan petani', 'Pulau Jawa', 'rural-village'],
    ['Sawah dan panen', 'Majapahit', 'rural-village'],
    ['Subak', 'Bali', 'rural-village'],
    ['Perang Diponegoro', 'Pulau Jawa', 'resistance-outpost'],
    ['Perang Jawa', 'Jawa Tengah', 'resistance-outpost'],
    ['Perang Padri', 'Sumatera Barat', 'resistance-outpost'],
    ['Puputan', 'Bali', 'resistance-outpost'],
    ['Perlawanan rakyat', 'Sumatera Barat', 'resistance-outpost'],
    ['Proklamasi Kemerdekaan Indonesia', 'Jakarta', 'resistance-outpost'],
    ['Pertempuran Surabaya 10 November 1945', 'Jawa Timur', 'resistance-outpost'],
    ['Perlawanan rakyat pada masa pendudukan Jepang', 'Indonesia', 'archive'],
    ['Perang di Pasifik', 'Tokyo', 'archive'],
    ['Kehidupan masa kolonial', 'Pulau Jawa', 'archive'],
    ['Perang Dunia II', 'Pulau Jawa', 'archive'],
    ['Perang Dunia II', 'desa di Prancis', 'archive'],
    ['Perang Dunia II', 'Sunda Kelapa', 'archive'],
    ['Sriwijaya', 'Perang Dunia II, Tokyo', 'archive'],
    ['https://wwii.example.com', '', 'archive'],
    ['awwiiword', '', 'archive'],
    ['WWII', 'unknown island', 'archive'],
    [null, {}, 'archive'],
    ['x'.repeat(501) + ' WWII', '', 'archive'],
  ])('%s / %s -> %s', (topic, location, roomId) => {
    expect(resolveRoom({ topic, location }).roomId).toBe(roomId);
  });
  test('missing input returns archive', () => expect(resolveRoom().roomId).toBe('archive'));
  test.each([
    ['Al-Khawarizmi', ''],
    ['Bayt al-Hikmah', 'Baghdad'],
    ['Sokrates filsuf Yunani', 'Athena'],
    ['Aristoteles', ''],
    ['Ibn Sina', ''],
    ['Perpustakaan Aleksandria', ''],
    ['ilmu pengetahuan islam', ''],
    ['  HOUSE OF WISDOM  ', 'Baghdad'],
    ['', 'Ancient Greece'],
  ])('ancient-library: %s / %s', (topic, location) => {
    expect(resolveRoom({ topic, location })).toEqual({
      roomId: 'ancient-library', reason: 'ancient-scholarship',
    });
  });
  test.each([
    ['Aristoteles Perang Dunia I', 'France', 'ww1-field-station', 'western-front-ww1'],
    ['Ibn Sina WWII', 'London', 'ww2-radio-room', 'british-home-front-ww2'],
    ['Aristoteles WWI WWII', '', 'archive', 'conflicting-eras'],
    ['https://example.test/Aristoteles', '', 'archive', 'untrusted-input'],
    ['<b>Ibn Sina</b>', '', 'archive', 'untrusted-input'],
    ['xAristotelesx', '', 'archive', 'no-supported-setting'],
    ['x'.repeat(501) + ' Aristoteles', '', 'archive', 'no-supported-setting'],
  ])('preserves selection guards: %s / %s', (topic, location, roomId, reason) => {
    expect(resolveRoom({ topic, location })).toEqual({ roomId, reason });
  });
  test('honors only a safe, locally authored environment key', () => {
    expect(resolveRoom({
      topic: 'Ibn Sina', location: '', environmentKey: 'ancient-library',
    })).toEqual({ roomId: 'ancient-library', reason: 'environment-key' });
    expect(resolveRoom({
      topic: 'Aristoteles WWI WWII', environmentKey: 'ancient-library',
    })).toEqual({ roomId: 'ancient-library', reason: 'environment-key' });
    expect(resolveRoom({
      topic: 'https://example.test/Ibn-Sina', environmentKey: 'ancient-library',
    })).toEqual({ roomId: 'archive', reason: 'untrusted-input' });
    expect(resolveRoom({
      topic: 'Majapahit', location: 'Java', environmentKey: 'kingdom-court',
    })).toEqual({ roomId: 'kingdom-court', reason: 'environment-key' });
    expect(resolveRoom({
      topic: 'Majapahit', location: 'Java', environmentKey: 'unknown-room',
    }).roomId).toBe('archive');
    expect(resolveRoom({
      topic: 'https://example.test', environmentKey: 'kingdom-court',
    }).roomId).toBe('archive');
    expect(resolveRoom({
      topic: 'Jalur rempah', location: '', environmentKey: 'market-port',
    })).toEqual({ roomId: 'market-port', reason: 'environment-key' });
    expect(resolveRoom({
      topic: 'Majapahit', location: 'Java', environmentKey: 'rural-village',
    })).toEqual({ roomId: 'rural-village', reason: 'environment-key' });
    expect(resolveRoom({
      topic: 'Majapahit', location: 'Java', environmentKey: 'resistance-outpost',
    })).toEqual({ roomId: 'resistance-outpost', reason: 'environment-key' });
  });
});
