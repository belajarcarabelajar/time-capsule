import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Session check failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Process URL params after OAuth callback redirect
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('auth_success');
    const error = urlParams.get('auth_error');

    if (error) {
      setAuthError(decodeURIComponent(error));
    }

    if (success || error) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    checkSession();
  }, []);

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, setAuthError, loginWithGoogle, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

const defaultAuthContext = {
  user: null,
  loading: false,
  authError: null,
  setAuthError: () => {},
  loginWithGoogle: () => {},
  logout: () => {},
  checkSession: () => {},
};

export const useAuth = () => useContext(AuthContext) || defaultAuthContext;
