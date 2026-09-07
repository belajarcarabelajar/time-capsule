import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../../../../..');
describe('authored history room artifacts', () => {
  for (const id of ['archive', 'ww1-field-station', 'ww2-radio-room']) {
    test(`${id} ships editable source, textured model and lightweight poster`, () => {
      const source = readFileSync(`${root}/assets/history/source/${id}.blend`);
      expect(source.subarray(0, 7).toString()).toBe('BLENDER');
      const base = `${root}/apps/web/public/history/${id}`;
      const model = readFileSync(`${base}/room.glb`);
      expect(model.subarray(0, 4).toString()).toBe('glTF');
      expect(model.length).toBeLessThanOrEqual(4 * 1024 * 1024);
      const scene = JSON.parse(model.subarray(20, 20 + model.readUInt32LE(12)).toString());
      expect(scene.images.length).toBeGreaterThan(0);
      expect(scene.meshes.length).toBeLessThanOrEqual(60);
      if (id === 'ww1-field-station') {
        expect(scene.nodes.map(node => node.name)).toContain('Distant ruined masonry');
      }
      expect(statSync(`${base}/poster.webp`).size).toBeLessThanOrEqual(250 * 1024);
      const provenance = JSON.parse(readFileSync(`${root}/assets/history/provenance.json`));
      expect(provenance.rooms[id].source).toBe(`assets/history/source/${id}.blend`);
      expect(provenance.rooms[id].objects).toHaveLength(3);
    });
  }
});
