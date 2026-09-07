import { test, expect, mock, afterEach } from 'bun:test';
import { fetchScenarioData } from '../geminiClient.js';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
for (const status of [401, 403, 503]) {
  for (const body of ['', 'not json', '{}']) {
    test(`status ${status} with ${JSON.stringify(body)} never falls back`, async () => {
      global.fetch = mock(async () => new Response(body, { status }));
      await expect(fetchScenarioData('World War I', 1)).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  }
}
