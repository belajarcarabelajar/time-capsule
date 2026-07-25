import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

import { test, expect, describe, afterEach, mock, beforeEach, spyOn } from 'bun:test';
import React from 'react';
import UserBar from '../UserBar.jsx';
import * as AuthContextModule from '../../context/AuthContext.jsx';

const { render, cleanup, fireEvent } = await import('@testing-library/react');

describe('UserBar Component', () => {
  let useAuthSpy;

  afterEach(() => {
    cleanup();
    if (useAuthSpy) {
      useAuthSpy.mockRestore();
    }
  });

  test('renders loading state when auth is loading', () => {
    useAuthSpy = spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: true,
      loginWithGoogle: mock(),
      logout: mock()
    });

    const { getByText } = render(<UserBar />);
    expect(getByText('Memuat...')).toBeTruthy();
  });

  test('renders login button when user is not authenticated and triggers loginWithGoogle', () => {
    const mockLogin = mock();
    useAuthSpy = spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      loginWithGoogle: mockLogin,
      logout: mock()
    });

    const { getByRole, getByText } = render(<UserBar />);
    const loginBtn = getByRole('button', { name: /Masuk dengan Google/i });
    expect(loginBtn).toBeTruthy();

    fireEvent.click(loginBtn);
    expect(mockLogin).toHaveBeenCalled();
  });

  test('renders user avatar image and name when authenticated with picture', () => {
    useAuthSpy = spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Ahmad Yani', email: 'ahmad@example.com', picture: 'https://example.com/avatar.jpg' },
      loading: false,
      loginWithGoogle: mock(),
      logout: mock()
    });

    const { getByText, getByAltText } = render(<UserBar />);
    expect(getByText('Ahmad Yani')).toBeTruthy();
    const avatarImg = getByAltText('Ahmad Yani');
    expect(avatarImg.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  test('renders name initial fallback when user has no picture', () => {
    useAuthSpy = spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Siti Rahma', email: 'siti@example.com', picture: null },
      loading: false,
      loginWithGoogle: mock(),
      logout: mock()
    });

    const { getByText } = render(<UserBar />);
    expect(getByText('Siti Rahma')).toBeTruthy();
    expect(getByText('S')).toBeTruthy();
  });

  test('toggles dropdown on click and displays email and logout option', () => {
    const mockLogout = mock();
    useAuthSpy = spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Budi Santoso', email: 'budi@example.com' },
      loading: false,
      loginWithGoogle: mock(),
      logout: mockLogout
    });

    const { getByRole, getByText, queryByText } = render(<UserBar />);

    expect(queryByText('budi@example.com')).toBeNull();

    const userButton = getByRole('button');
    fireEvent.click(userButton);

    expect(getByText('budi@example.com')).toBeTruthy();
    const logoutBtn = getByRole('button', { name: /Keluar/i });
    expect(logoutBtn).toBeTruthy();

    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalled();
    expect(queryByText('budi@example.com')).toBeNull();
  });

  test('closes dropdown when clicking outside', () => {
    useAuthSpy = spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Dewi Lestari', email: 'dewi@example.com' },
      loading: false,
      loginWithGoogle: mock(),
      logout: mock()
    });

    const { getByRole, getByText, queryByText } = render(
      <div>
        <div data-testid="outside">Outside Element</div>
        <UserBar />
      </div>
    );

    const userButton = getByRole('button', { name: /Dewi Lestari/i });
    fireEvent.click(userButton);
    expect(getByText('dewi@example.com')).toBeTruthy();

    fireEvent.mouseDown(document.body);
    expect(queryByText('dewi@example.com')).toBeNull();
  });
});
