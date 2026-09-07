import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const sessionRequest = useRef(0);
  const loggedOut = useRef(false);
  const checkSession = useCallback(async () => {
    if (loggedOut.current) return;
    const requestId = ++sessionRequest.current;
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Session unavailable');
      const data = await res.json();
      if (requestId !== sessionRequest.current) return;
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Session check failed:", err);
      if (requestId === sessionRequest.current) {
        setUser(previous => previous ? { ...previous, points: null, maxPoints: null, pointsAvailable: false } : null);
      }
    } finally {
      if (requestId === sessionRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Process URL params after OAuth callback redirect
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('auth_success');
    const error = urlParams.get('auth_error');

    if (error) {
      setAuthError(error);
    }

    if (success || error) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    checkSession();
    return () => { sessionRequest.current += 1; };
  }, [checkSession]);

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = async () => {
    loggedOut.current = true;
    sessionRequest.current += 1;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
      loggedOut.current = false;
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
