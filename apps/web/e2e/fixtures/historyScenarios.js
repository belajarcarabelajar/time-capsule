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

export async function mockHistoryApi(page, location = scenario.meta.location, environmentKey) {
  const calls = [];
  await page.route('**/api/auth/me', route => route.fulfill({ json: {
    authenticated: true, user: { id: 'fixture', name: 'Penjelajah', points: 50, maxPoints: 50 },
  } }));
  await page.route('**/api/scenario', route => {
    calls.push('scenario');
    return route.fulfill({ json: {
      success: true,
      result: { response: JSON.stringify({ ...scenario, meta: {
        ...scenario.meta, location, ...(environmentKey ? { environmentKey } : {}),
      } }) },
    } });
  });
  await page.route(/generativelanguage\.googleapis\.com|api\.cloudflare\.com|agentrouter\.org/, route => route.abort());
  return calls;
}
