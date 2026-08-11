import React, { useState, useRef, useEffect } from 'react';

export default function Header({
  isLoggedIn, isAdminLoggedIn,
  username,
  onLogout, onAdminLogout,
  onLoginClick, onAdminLoginClick,
  onToggleSidebar,
  theme, onToggleTheme
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = username ? username.slice(0, 2).toUpperCase() : '?';
  const isDark = theme === 'dark';

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">☰</button>
        <div className="header-logo">🚂</div>
        <div className="header-title">
          <h1>Running Room</h1>
          <p>Operations Dashboard</p>
        </div>
      </div>

      <div className="header-center">
        <div className="header-search">
          <span className="search-icon">🔍</span>
          <input placeholder="Search buildings, employees..." />
        </div>
      </div>

      <div className="header-right">
        <div className="status-badge">
          <span className="status-dot" />
          System Online
        </div>

        {/* Theme toggle */}
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {isLoggedIn ? (
          <div className="user-menu" onClick={() => setDropdownOpen(v => !v)} ref={dropRef}>
            <div className="user-avatar">{initials}</div>
            <span className="user-name">{username}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>▾</span>

            {dropdownOpen && (
              <div className="user-dropdown" onClick={e => e.stopPropagation()}>
                <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--text-muted)' }}>
                  Signed in as <strong style={{ color: 'var(--text-primary)' }}>{username}</strong>
                </div>
                <div className="dropdown-divider" />
                {!isAdminLoggedIn && (
                  <button onClick={() => { onAdminLoginClick(); setDropdownOpen(false); }}>
                    🔐 Admin Login
                  </button>
                )}
                {isAdminLoggedIn && (
                  <button className="danger" onClick={() => { onAdminLogout(); setDropdownOpen(false); }}>
                    🔓 Admin Logout
                  </button>
                )}
                <div className="dropdown-divider" />
                <button className="danger" onClick={() => { onLogout(); setDropdownOpen(false); }}>
                  ↩ Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onLoginClick}>
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
