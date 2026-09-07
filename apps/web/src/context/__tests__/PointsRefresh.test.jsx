import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
import { test, expect, afterEach, mock } from 'bun:test';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext.jsx';
const { render, cleanup, act } = await import('@testing-library/react');
const originalFetch = global.fetch;
afterEach(() => { cleanup(); global.fetch = originalFetch; });
let auth;
function Probe() { auth = useAuth(); return <span>{auth.user?.points ?? 'none'}</span>; }
const response = (points) => new Response(JSON.stringify({ authenticated: true, user: { id: 'u', points } }));
async function setup() {
  global.fetch = mock(async () => response(50));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
}
test('latest refresh wins even when an older balance arrives later', async () => {
  await setup();
  const resolve = [];
  global.fetch = mock(() => new Promise(r => resolve.push(r)));
  let first, second;
  await act(async () => { first = auth.checkSession(); second = auth.checkSession(); });
  await act(async () => { resolve[1](response(30)); await second; });
  await act(async () => { resolve[0](response(40)); await first; });
  expect(auth.user.points).toBe(30);
});
test('refresh failure preserves authenticated identity and marks balance unavailable', async () => {
  await setup();
  global.fetch = mock(async () => { throw new Error('offline'); });
  await act(async () => { await auth.checkSession(); });
  expect(auth.user?.id).toBe('u');
  expect(auth.user?.points).toBeNull();
});
test('a pending refresh cannot resurrect a logged out user', async () => {
  await setup();
  let resolve;
  global.fetch = mock(url => url.endsWith('/logout') ? Promise.resolve(new Response('{}')) : new Promise(r => { resolve = r; }));
  let pending;
  await act(async () => { pending = auth.checkSession(); await auth.logout(); });
  await act(async () => { resolve(response(40)); await pending; });
  expect(auth.user).toBeNull();
});
