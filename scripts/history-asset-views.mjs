import { roomManifest } from '../apps/web/src/immersive/rooms.js';
import { resolveVisit } from '../apps/web/src/immersive/visualVisits.js';

const id = process.argv[2];
if (!Object.hasOwn(roomManifest, id)) throw new Error('Unknown authored room');
console.log(JSON.stringify([1, 2, 3].map(chapter => {
  const { position, target } = resolveVisit(id, chapter).camera;
  return { position, target };
})));
