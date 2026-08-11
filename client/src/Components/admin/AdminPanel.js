import React from 'react';

export default function AdminPanel({ users, isAdminLoggedIn, onAddBuilding, onRegisterStation }) {
  if (!isAdminLoggedIn) return null;

  return (
    <div className="page-enter">
      <div className="page-header">
        <h2>User Management</h2>
        <p>View and manage registered users</p>
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <span className="admin-section-title">Registered Users</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{users.length} users</span>
        </div>

        {users.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No registered users found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--purple-bg)', border: '1px solid var(--purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--purple)' }}>
                          {user.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontWeight: 500 }}>{user.username}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-green">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
