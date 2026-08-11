import React from 'react';

export default function AdminLoginModal({ isOpen, onClose, onLogin, loginData, onChange, loading }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Admin Login</h3>
            <p>Authenticate to access administration features.</p>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={onLogin}>
          <div className="modal-body">
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--purple-bg)', border: '1px solid var(--purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 8px' }}>🔐</div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-username">Admin Username</label>
              <input
                id="admin-username"
                className="form-input"
                type="text"
                name="username"
                placeholder="Enter admin username"
                value={loginData.username}
                onChange={onChange}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">Admin Password</label>
              <input
                id="admin-password"
                className="form-input"
                type="password"
                name="password"
                placeholder="Enter admin password"
                value={loginData.password}
                onChange={onChange}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Admin Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
