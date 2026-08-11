import React from 'react';

export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {description && <div className="empty-desc">{description}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function LoadingSkeletons({ type = 'stat', count = 4 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: type === 'stat' ? 'repeat(4,1fr)' : 'repeat(auto-fill, minmax(280px,1fr))',
      gap: 16
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton skeleton-${type}`} />
      ))}
    </div>
  );
}
