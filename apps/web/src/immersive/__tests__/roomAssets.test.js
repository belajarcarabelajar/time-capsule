import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { roomManifest } from '../rooms.js';
import { resolveVisit } from '../visualVisits.js';

const root = resolve(import.meta.dir, '../../../../..');
describe('authored history room artifacts', () => {
  for (const id of Object.keys(roomManifest)) {
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
    test(`${id} preserves local motion pivots and verifies three authored views`, () => {
      const base = `${root}/apps/web/public/history/${id}`;
      const model = readFileSync(`${base}/room.glb`);
      const scene = JSON.parse(model.subarray(20, 20 + model.readUInt32LE(12)).toString());
      for (const name of ['ambient_figure', 'ambient_prop']) {
        const node = scene.nodes.find(candidate => candidate.name === name);
        expect(node).toBeDefined();
        expect(node.children.length).toBeGreaterThan(0);
      }
      expect(scene.skins ?? []).toHaveLength(0);
      const primitives = scene.meshes.flatMap(mesh => mesh.primitives);
      expect(primitives.length).toBeLessThanOrEqual(60);
      expect(primitives.reduce((sum, primitive) => sum + scene.accessors[primitive.indices].count / 3, 0))
        .toBeLessThanOrEqual(100000);
      expect([...(scene.images ?? []), ...(scene.buffers ?? [])].every(resource => !resource.uri)).toBe(true);
      const report = JSON.parse(readFileSync(`${base}/export-report.json`));
      expect(report.views).toEqual([1, 2, 3].map(chapter => {
        const { position, target } = resolveVisit(id, chapter).camera;
        return { position, target };
      }));
      for (const name of ['room.glb', 'poster.webp', 'poster-detail.webp', 'poster-context.webp']) {
        const file = readFileSync(`${base}/${name}`);
        expect(report.files[name].sha256).toBe(createHash('sha256').update(file).digest('hex'));
        if (name.endsWith('.webp')) expect(file.length).toBeLessThanOrEqual(250 * 1024);
      }
      expect(readFileSync(`${base}/poster-detail.webp`).equals(readFileSync(`${base}/poster.webp`))).toBe(false);
      const posters = ['poster.webp', 'poster-detail.webp', 'poster-context.webp'];
      expect(new Set(posters.map(name => report.files[name].sha256)).size).toBe(3);
      const provenance = JSON.parse(readFileSync(`${root}/assets/history/provenance.json`));
      expect(provenance.enrichment.figureLabel).toContain('ilustratif');
      expect(provenance.enrichment.figureRoles[id]).toContain('Anonymous');
      expect(provenance.enrichment.license).toBe('MIT');
      expect([...provenance.rooms[id].objects].sort()).toEqual(roomManifest[id].objects.map(object => object.id).sort());
    });
  }
});
