import React from 'react';
import Drawer from '../common/Drawer';

export default function CheckInDrawer({ isOpen, onClose, bedName, arrivalDetails, onArrivalChange, onSubmit, loading }) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={bedName}
      subtitle="Check-in a crew member to this bed"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={loading || !arrivalDetails.name || !arrivalDetails.day || !arrivalDetails.time}
          >
            {loading ? 'Checking In...' : 'Confirm Check-in'}
          </button>
        </>
      }
    >
      <div className="drawer-bed-status available">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
        Available
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="ci-name">Employee Name *</label>
        <input
          id="ci-name"
          className="form-input"
          type="text"
          name="name"
          placeholder="Enter employee name"
          value={arrivalDetails.name}
          onChange={onArrivalChange}
          required
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="ci-day">Arrival Date *</label>
        <input
          id="ci-day"
          className="form-input"
          type="date"
          name="day"
          value={arrivalDetails.day}
          onChange={onArrivalChange}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="ci-time">Arrival Time *</label>
        <input
          id="ci-time"
          className="form-input"
          type="time"
          name="time"
          value={arrivalDetails.time}
          onChange={onArrivalChange}
          required
        />
      </div>
    </Drawer>
  );
}
