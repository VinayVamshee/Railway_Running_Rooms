import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard',  icon: '⊞', label: 'Dashboard' },
  { id: 'buildings',  icon: '🏛', label: 'Buildings' },
  { id: 'arrivals',   icon: '↔', label: 'Arrivals & Departures' },
  { id: 'analytics',  icon: '📈', label: 'Analytics' },
  { id: 'reports',    icon: '📋', label: 'Reports' },
];

const ADMIN_ITEMS = [
  { id: 'admin-buildings', icon: '⚙', label: 'Manage Buildings' },
  { id: 'admin-users',     icon: '👥', label: 'Manage Users' },
];

export default function Sidebar({ activePage, onNavigate, isAdminLoggedIn, isOpen, onClose }) {
  return (
    <>
      <div className={`sidebar-mobile-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🚂</div>
          <div className="sidebar-logo-text">
            <h2>Running Room</h2>
            <p>SECR Operations</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => { onNavigate(item.id); onClose(); }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {isAdminLoggedIn && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 8 }}>Administration</div>
              {ADMIN_ITEMS.map(item => (
                <button
                  key={item.id}
                  className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => { onNavigate(item.id); onClose(); }}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
