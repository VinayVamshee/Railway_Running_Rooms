import React from 'react';

export default function BuildingModal({ isOpen, onClose, onSubmit, editMode, building, roomNames, onBuildingNameChange, onNumberOfRoomsChange, onRoomNameChange, loading }) {

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{editMode ? 'Edit Building' : 'Add New Building'}</h3>
            <p>{editMode ? 'Update building details and bed configuration.' : 'Configure a new running room building.'}</p>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Building Name *</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Bilaspur Wing"
                value={building.name}
                onChange={onBuildingNameChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Number of Beds *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max="200"
                value={building.noOfRooms || ''}
                onChange={onNumberOfRoomsChange}
                required
              />
              <span className="form-hint">Enter the total number of beds to configure for this building.</span>
            </div>

            {building.noOfRooms > 0 && (
              <div className="form-group">
                <label className="form-label">Bed Names (optional)</label>
                <div className="room-names-grid">
                  {Array.from({ length: building.noOfRooms }, (_, index) => (
                    <div key={index} className="room-name-item">
                      <label className="room-name-label">Bed {index + 1}</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder={`B-${index + 1}`}
                        value={roomNames[index] || ''}
                        onChange={(e) => onRoomNameChange(e, index)}
                        style={{ padding: '7px 10px', fontSize: 13 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : editMode ? 'Update Building' : 'Create Building'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
