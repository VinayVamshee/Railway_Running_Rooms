import React from 'react';

function isOccupied(room) {
  if (!room.logs || room.logs.length === 0) return false;
  return room.logs.some(l => l.inTime && !l.outTime);
}

function getLastLog(room) {
  if (!room.logs || room.logs.length === 0) return null;
  const activeLog = room.logs.find(l => l.inTime && !l.outTime);
  return activeLog || room.logs[room.logs.length - 1];
}

function calculateDuration(log) {
  if (!log || !log.day || !log.inTime) return null;
  try {
    const inDt = new Date(`${log.day}T${log.inTime}`);
    const now = new Date();
    const diffMs = now - inDt;
    if (diffMs < 0) return null;
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  } catch { return null; }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export default function BedCard({ room, onClick }) {
  const occupied = isOccupied(room);
  const lastLog = getLastLog(room);
  const bedName = room.roomName || `Bed ${room.roomNumber}`;
  const status = occupied ? 'occupied' : 'available';

  return (
    <button className={`bed-card ${status}`} onClick={onClick} title={occupied ? `Occupied by ${lastLog?.name || 'Unknown'}` : 'Available for check-in'}>
      <div className="bed-status-indicator" />
      <div className="bed-card-number">{bedName}</div>
      <div className="bed-card-status">{occupied ? 'Occupied' : 'Free'}</div>
    </button>
  );
}

export { isOccupied, getLastLog, calculateDuration, formatDate };
