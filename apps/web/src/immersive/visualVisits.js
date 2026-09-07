import { roomManifest } from './rooms.js';

const detailViews = {
  archive: { position: [6, 5, 9], target: [-0.6, 1.6, -1] },
  'ww1-field-station': { position: [5.5, 4.7, 9], target: [-0.5, 1.5, -1] },
  'ww2-radio-room': { position: [5, 4.5, 9], target: [0, 1.5, -1.2] },
  'kingdom-court': { position: [6, 4.8, 10], target: [-0.6, 1.6, -1] },
  'market-port': { position: [7, 4.2, 11], target: [-0.5, 1.2, -2] },
  'rural-village': { position: [8, 5.4, 9.5], target: [-0.4, 1.1, -1.5] },
};

const visits = Object.fromEntries(Object.values(roomManifest).map(room => {
  const detail = detailViews[room.id];
  return [room.id, [
    {
      id: `${room.id}-reveal`, camera: room.camera,
      arrival: { ...detail, duration: 1.2 },
      focusObjectId: room.objects[0].id, posterUrl: room.posterUrl,
    },
    {
      id: `${room.id}-focus`, camera: detail,
      arrival: { position: room.camera.position, target: room.camera.target, duration: 1.2 },
      focusObjectId: room.objects[1].id, posterUrl: `/history/${room.id}/poster-detail.webp`,
    },
  ]];
}));

export function resolveVisit(roomId, chapterCount = 1) {
  const roomVisits = Object.hasOwn(visits, roomId) ? visits[roomId] : visits.archive;
  const chapter = Number.isSafeInteger(chapterCount) && chapterCount > 0 ? chapterCount : 1;
  return roomVisits[(chapter - 1) % roomVisits.length];
}
