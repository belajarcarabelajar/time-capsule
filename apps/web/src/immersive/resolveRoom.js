const normalize = value => typeof value === 'string'
  ? value.slice(0, 500).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim() : '';
const firstWar = /\b(?:ww\s*1|ww\s*i|world war (?:1|i|one)|perang dunia (?:1|i|pertama))\b/u;
const secondWar = /\b(?:ww\s*2|ww\s*ii|world war (?:2|ii|two)|perang dunia (?:2|ii|kedua))\b/u;
const westernFront = /\b(?:western front|front barat|front occidental|flanders|france|prancis|perancis|belgium|belgia|verdun|somme|ypres)\b/u;
const london = /\b(?:london|british home front|britain|britania|inggris|england|united kingdom)\b/u;
const incompatible = /\b(?:tokyo|japan|jepang|pacific|pasifik|asia|indonesia|java|jawa|africa|afrika|russia|rusia|moscow|berlin|germany|jerman|italy|italia|america|amerika|pearl harbor|normandy|normandia)\b/u;

export function resolveRoom({ topic, location } = {}) {
  const text = normalize(topic);
  const place = normalize(location);
  const all = `${text} ${place}`;
  const archive = reason => ({ roomId: 'archive', reason });
  if (/https?:|www\.|[<>]/u.test(all)) return archive('untrusted-input');
  const first = firstWar.test(all);
  const second = secondWar.test(all);
  if (first && second) return archive('conflicting-eras');
  if (incompatible.test(all)) return archive('outside-authored-scope');
  if (first && (!place || westernFront.test(place)) && !london.test(all)) {
    return { roomId: 'ww1-field-station', reason: 'western-front-ww1' };
  }
  if (second && (!place || london.test(place)) && !westernFront.test(all)) {
    return { roomId: 'ww2-radio-room', reason: 'british-home-front-ww2' };
  }
  return archive('no-supported-setting');
}
