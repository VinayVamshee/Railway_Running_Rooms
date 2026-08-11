import React, { useState, useRef, useEffect } from 'react';

function calculateAvailableRooms(rooms) {
  return rooms.filter(room =>
    room.logs.filter(l => l.inTime).length === room.logs.filter(l => l.outTime).length
  ).length;
}

export default function BuildingCard({ building, isAdminLoggedIn, onViewBeds, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const total = building.rooms.length;
  const available = calculateAvailableRooms(building.rooms);
  const occupied = total - available;
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <div className="building-card">
      <div className="building-card-header">
        <div>
          <div className="building-card-name">{building.name}</div>
          <div className="building-card-type">Running Room</div>
        </div>
        {isAdminLoggedIn && (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button className="kebab-btn" onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}>
              ⋮
            </button>
            {menuOpen && (
              <div className="kebab-menu">
                <button onClick={() => { onEdit(building); setMenuOpen(false); }}>
                  ✏️ Edit Building
                </button>
                <button className="danger" onClick={() => { onDelete(building._id); setMenuOpen(false); }}>
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="building-bed-count">{total}</div>
        <div className="building-bed-label">Total Beds</div>
      </div>

      <div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
          {pct}% occupied
        </div>
      </div>

      <div className="building-stats">
        <span className="building-stat">
          <span className="stat-dot occupied" />
          {occupied} Occupied
        </span>
        <span className="building-stat">
          <span className="stat-dot available" />
          {available} Available
        </span>
      </div>

      <div className="building-card-footer">
        <button className="view-beds-btn" onClick={() => onViewBeds(building)}>
          View Beds →
        </button>
      </div>
    </div>
  );
}
