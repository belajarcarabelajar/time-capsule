import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

import { test, expect, describe, afterEach, mock, beforeEach } from 'bun:test';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext.jsx';

const { render, cleanup, act, fireEvent } = await import('@testing-library/react');

// Helper component to read auth context state in tests
function TestComponent({ onRender }) {
  const auth = useAuth();
  if (onRender) onRender(auth);
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.name : 'No User'}</span>
      <span data-testid="loading">{auth.loading ? 'Loading' : 'Ready'}</span>
      <span data-testid="error">{auth.authError || 'No Error'}</span>
      <button data-testid="login" onClick={auth.loginWithGoogle}>Login</button>
      <button data-testid="logout" onClick={auth.logout}>Logout</button>
    </div>
  );
}

describe('AuthContext & AuthProvider', () => {
  let originalFetch;
  let originalLocation;
  let replaceStateMock;

  beforeEach(() => {
    originalFetch = global.fetch;
    replaceStateMock = mock();
    window.history.replaceState = replaceStateMock;
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
  });

  test('useAuth returns default context when used outside AuthProvider', () => {
    let capturedAuth;
    render(<TestComponent onRender={(auth) => { capturedAuth = auth; }} />);
    
    expect(capturedAuth).toBeDefined();
    expect(capturedAuth.user).toBeNull();
    expect(capturedAuth.loading).toBe(false);
    expect(capturedAuth.authError).toBeNull();
    expect(typeof capturedAuth.loginWithGoogle).toBe('function');
    expect(typeof capturedAuth.logout).toBe('function');
    expect(typeof capturedAuth.checkSession).toBe('function');
  });

  test('fetches session on mount and sets user when authenticated', async () => {
    const mockUser = { id: 'u1', name: 'Budi' };
    global.fetch = mock(async (url) => {
      if (url === '/api/auth/me') {
        return new Response(JSON.stringify({ authenticated: true, user: mockUser }), { status: 200 });
      }
      return new Response('', { status: 404 });
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId('loading').textContent).toBe('Loading');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(getByTestId('loading').textContent).toBe('Ready');
    expect(getByTestId('user').textContent).toBe('Budi');
  });

  test('sets user to null when /api/auth/me returns authenticated: false', async () => {
    global.fetch = mock(async (url) => {
      if (url === '/api/auth/me') {
        return new Response(JSON.stringify({ authenticated: false }), { status: 200 });
      }
      return new Response('', { status: 404 });
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(getByTestId('loading').textContent).toBe('Ready');
    expect(getByTestId('user').textContent).toBe('No User');
  });

  test('handles session fetch network error gracefully', async () => {
    global.fetch = mock(async () => {
      throw new Error('Network error');
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(getByTestId('loading').textContent).toBe('Ready');
    expect(getByTestId('user').textContent).toBe('No User');
  });

  test('handles auth_error URL parameter and cleans history', async () => {
    global.fetch = mock(async () => new Response(JSON.stringify({ authenticated: false }), { status: 200 }));
    
    delete window.location;
    window.location = new URL('http://localhost/?auth_error=Gagal%20login');

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(getByTestId('error').textContent).toBe('Gagal login');
    expect(replaceStateMock).toHaveBeenCalled();
  });

  test('handles auth_success URL parameter and cleans history', async () => {
    global.fetch = mock(async () => new Response(JSON.stringify({ authenticated: false }), { status: 200 }));
    
    delete window.location;
    window.location = new URL('http://localhost/?auth_success=true');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(replaceStateMock).toHaveBeenCalled();
  });

  test('loginWithGoogle updates window location to /api/auth/login', async () => {
    global.fetch = mock(async () => new Response(JSON.stringify({ authenticated: false }), { status: 200 }));
    
    delete window.location;
    window.location = { href: '' };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    fireEvent.click(getByTestId('login'));
    expect(window.location.href).toBe('/api/auth/login');
  });

  test('logout calls POST /api/auth/logout and resets user to null', async () => {
    let logoutCalled = false;
    global.fetch = mock(async (url, options) => {
      if (url === '/api/auth/me') {
        return new Response(JSON.stringify({ authenticated: true, user: { name: 'Active User' } }), { status: 200 });
      }
      if (url === '/api/auth/logout' && options?.method === 'POST') {
        logoutCalled = true;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response('', { status: 404 });
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(getByTestId('user').textContent).toBe('Active User');

    await act(async () => {
      fireEvent.click(getByTestId('logout'));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(logoutCalled).toBe(true);
    expect(getByTestId('user').textContent).toBe('No User');
  });
});
