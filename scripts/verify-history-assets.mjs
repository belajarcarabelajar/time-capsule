import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roomManifest } from '../apps/web/src/immersive/rooms.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const provenance = JSON.parse(readFileSync(resolve(root, 'assets/history/provenance.json'), 'utf8'));
const requested = process.argv.slice(2);
const ids = requested.length ? requested : Object.keys(roomManifest);
let failures = 0;
for (const id of ids) {
  try {
    if (!Object.hasOwn(roomManifest, id)) throw new Error('Unknown room');
    const record = provenance.rooms[id];
    if (!record) throw new Error('Missing provenance');
    const room = roomManifest[id];
    const model = readFileSync(resolve(root, record.model));
    if (model.toString('utf8', 0, 4) !== 'glTF' || model.readUInt32LE(4) !== 2) throw new Error('Invalid GLB');
    const gltf = JSON.parse(model.toString('utf8', 20, 20 + model.readUInt32LE(12)));
    const primitives = gltf.meshes.flatMap(mesh => mesh.primitives);
    const triangles = primitives.reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    if (model.length > 4 * 1024 * 1024 || triangles > 100000 || primitives.length > 60) throw new Error('Mobile model budget exceeded');
    for (const name of ['ambient_figure', 'ambient_prop']) {
      if (!gltf.nodes.some(node => node.name === name && node.children?.length)) throw new Error(`Missing motion group: ${name}`);
    }
    if (gltf.skins?.length) throw new Error('Unexpected skinned mesh');
    if ([...(gltf.images ?? []), ...(gltf.buffers ?? [])].some(resource => resource.uri)) throw new Error('Non-embedded resource');
    if (!provenance.enrichment?.figureLabel?.includes('ilustratif') || !provenance.enrichment.figureRoles[id]) throw new Error('Missing illustrative figure provenance');
    const detailPoster = resolve(dirname(resolve(root, record.poster)), 'poster-detail.webp');
    if (statSync(detailPoster).size > 250 * 1024) throw new Error('Detail poster budget exceeded');
    if (statSync(resolve(root, record.poster)).size > 250 * 1024) throw new Error('Poster budget exceeded');
    if (readFileSync(resolve(root, record.source)).toString('utf8', 0, 7) !== 'BLENDER') throw new Error('Editable Blender source absent');
    if (room.objects.length !== 3 || record.objects.some(objectId => !room.objects.some(object => object.id === objectId))) throw new Error('Inspection/provenance mismatch');
    for (const assetUrl of [room.modelUrl, room.posterUrl]) {
      if (!assetUrl.startsWith(`/history/${id}/`) || assetUrl.includes('..')) throw new Error('Non-local asset URL');
    }
    const report = JSON.parse(readFileSync(resolve(root, record.checksums), 'utf8'));
    for (const [file, path] of [[`${id}.blend`, record.source], ['room.glb', record.model], ['poster.webp', record.poster], ['poster-detail.webp', detailPoster]]) {
      const checksum = createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
      if (report.files[file]?.sha256 !== checksum) throw new Error(`Checksum mismatch: ${file}`);
    }
    console.log(`${id}: OK; ${model.length} bytes, ${triangles} triangles, ${primitives.length} draw primitives; source and hashes verified`);
  } catch (error) {
    failures++;
    console.error(`${id}: ${error.message}`);
  }
}
process.exitCode = failures ? 1 : 0;
