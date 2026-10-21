export const scenario = {
  meta: { location: 'Western Front, France', themeColor: '#846943' },
  characters: {
    PLAYER: { id: 'PLAYER', name: 'Penjelajah', icon: '🧑🏻‍🚀', desc: 'Masa Depan' },
    NPC_1: { id: 'NPC_1', name: 'Pemandu', icon: '📖', desc: 'Teman belajar' },
    NPC_2: { id: 'NPC_2', name: 'Pembaca', icon: '📚', desc: 'Teman belajar' },
    NPC_3: { id: 'NPC_3', name: 'Penulis', icon: '✒️', desc: 'Teman belajar' },
  },
  scenes: { MAIN: { bg: 'from-stone-900 to-black', elements: [] } },
  script: [
    { type: 'dialogue', speakerId: 'NPC_1', mood: '🤔', text: 'Selamat datang di ruang belajar sejarah.' },
    { type: 'quiz', speakerId: 'NPC_1', mood: '🤔', text: 'Bagaimana kita memeriksa sebuah cerita?', choices: [
      { text: 'Membandingkan sumber', correct: true, response: 'Tepat, bandingkan sumber.' },
      { text: 'Menebak saja', correct: false, response: 'Mari periksa sumbernya.' },
    ] },
    { type: 'narrator', speakerId: 'NPC_1', mood: '✨', text: 'Sumber membantu kita memahami masa lalu.' },
  ],
};

// One mood for every line: RoomCanvas mutes the light for some moods, and the
// tour spec needs pixel changes that come from the camera alone.
const tourLines = [
  ['NPC_1', 'Mari mulai dari pandangan luas ruangan ini.'],
  ['PLAYER', 'Aku ingin melihat sisi kiri lebih dulu.'],
  ['NPC_2', 'Perhatikan benda pertama dari dekat.'],
  ['NPC_3', 'Sekarang kita lihat bagian yang lebih rinci.'],
  ['NPC_1', 'Benda kedua juga menyimpan cerita.'],
  ['PLAYER', 'Sisi kanan ruangan terlihat berbeda.'],
  ['NPC_2', 'Benda ketiga melengkapi gambaran kita.'],
  ['NPC_3', 'Dari atas, seluruh ruangan tampak jelas.'],
  ['NPC_1', 'Kita kembali ke pandangan awal.'],
];

export const tourScenario = {
  meta: { ...scenario.meta },
  characters: scenario.characters,
  scenes: scenario.scenes,
  script: [
    ...tourLines.map(([speakerId, text]) => ({ type: 'dialogue', speakerId, mood: '🤔', text })),
    { type: 'narrator', speakerId: 'NPC_1', mood: '🤔', text: 'Setiap sudut ruang membantu kita bertanya tentang masa lalu.' },
  ],
};

export async function mockHistoryApi(page, location = scenario.meta.location, environmentKey, data = scenario) {
  const calls = [];
  await page.route('**/api/auth/me', route => route.fulfill({ json: {
    authenticated: true, user: { id: 'fixture', name: 'Penjelajah', points: 50, maxPoints: 50 },
  } }));
  await page.route('**/api/scenario', route => {
    calls.push('scenario');
    return route.fulfill({ json: {
      success: true,
      result: { response: JSON.stringify({ ...data, meta: {
        ...data.meta, location, ...(environmentKey ? { environmentKey } : {}),
      } }) },
    } });
  });
  await page.route(/generativelanguage\.googleapis\.com|api\.cloudflare\.com|agentrouter\.org/, route => route.abort());
  return calls;
}
