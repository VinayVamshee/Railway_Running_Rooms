import React, { useMemo } from 'react';
import BedCard, { isOccupied } from './BedCard';
import EmptyState from '../common/EmptyState';

export default function BedGrid({ building, onBedClick, onBack }) {
  const stats = useMemo(() => {
    const total = building.rooms.length;
    const occ = building.rooms.filter(isOccupied).length;
    return { total, occupied: occ, available: total - occ };
  }, [building]);

  return (
    <div className="bed-grid-page">
      <div className="bed-grid-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="bed-grid-title">
          <h2>{building.name}</h2>
          <p>
            {stats.total} Beds · {stats.occupied} Occupied · {stats.available} Available
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span className="badge badge-orange">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
          {stats.occupied} Occupied
        </span>
        <span className="badge badge-green">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
          {stats.available} Available
        </span>
      </div>

      {building.rooms.length === 0 ? (
        <EmptyState icon="🛏" title="No beds configured" description="Edit this building to add beds." />
      ) : (
        <div className="bed-grid">
          {building.rooms.map(room => (
            <BedCard
              key={room._id}
              room={room}
              onClick={() => onBedClick(room, building._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
