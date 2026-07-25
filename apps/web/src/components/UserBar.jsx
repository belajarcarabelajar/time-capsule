import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Loader2 } from 'lucide-react';

export default function UserBar() {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-stone-900/80 px-3 py-1.5 rounded-full border border-amber-900/50 text-xs text-amber-200/60 font-sans">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
        <span>Memuat...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={loginWithGoogle}
        className="flex items-center gap-2.5 bg-stone-900 hover:bg-stone-800 text-amber-100 px-4 py-2 rounded-xl border border-amber-600/60 hover:border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all font-sans font-bold text-xs cursor-pointer group"
      >
        <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Masuk dengan Google</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2.5 bg-stone-900/90 hover:bg-stone-800 text-amber-100 px-3 py-1.5 rounded-full border border-amber-600/50 shadow-md transition-all cursor-pointer font-sans"
      >
        {user.picture ? (
          <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full border border-amber-500" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold text-stone-900">
            {user.name?.[0] || 'U'}
          </div>
        )}
        <span className="text-xs font-semibold max-w-[120px] truncate">{user.name}</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-stone-900 border border-amber-900/80 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 font-sans">
          <div className="px-3 py-2 border-b border-stone-800">
            <p className="text-xs font-bold text-amber-400 truncate">{user.name}</p>
            <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { setShowDropdown(false); logout(); }}
            className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </div>
  );
}
