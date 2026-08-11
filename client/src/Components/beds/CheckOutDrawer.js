import React from 'react';
import Drawer from '../common/Drawer';
import { calculateDuration, formatDate } from './BedCard';

export default function CheckOutDrawer({ isOpen, onClose, bedName, room, departureDetails, onDepartureChange, onSubmit, loading }) {
  const lastLog = room?.logs?.length > 0 ? room.logs[room.logs.length - 1] : null;
  const duration = calculateDuration(lastLog);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={bedName}
      subtitle="Log departure for this bed"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={loading || !departureDetails.day || !departureDetails.time}
          >
            {loading ? 'Checking Out...' : 'Confirm Check-out'}
          </button>
        </>
      }
    >
      <div className="drawer-bed-status occupied">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
        Occupied
      </div>

      {lastLog && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div className="drawer-info-row">
            <span className="drawer-info-label">Employee</span>
            <span className="drawer-info-value">{lastLog.name || '—'}</span>
          </div>
          <div className="drawer-info-row">
            <span className="drawer-info-label">Arrival</span>
            <span className="drawer-info-value">{formatDate(lastLog.day)} · {lastLog.inTime}</span>
          </div>
          {duration && (
            <div className="drawer-info-row">
              <span className="drawer-info-label">Duration</span>
              <span className="drawer-info-value" style={{ color: 'var(--orange)' }}>{duration}</span>
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="co-day">Departure Date *</label>
        <input
          id="co-day"
          className="form-input"
          type="date"
          name="day"
          value={departureDetails.day}
          onChange={onDepartureChange}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="co-time">Departure Time *</label>
        <input
          id="co-time"
          className="form-input"
          type="time"
          name="time"
          value={departureDetails.time}
          onChange={onDepartureChange}
          required
        />
      </div>
    </Drawer>
  );
}
