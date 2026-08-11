import React from 'react';
import BuildingCard from './BuildingCard';
import EmptyState, { LoadingSkeletons } from '../common/EmptyState';

export default function BuildingsList({ fetchedBuildings, loading, isAdminLoggedIn, isLoggedIn, onViewBeds, onEdit, onDelete, onAddBuilding }) {
  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Buildings</h2>
            <p>{fetchedBuildings.length} building{fetchedBuildings.length !== 1 ? 's' : ''} registered</p>
          </div>
          {isAdminLoggedIn && (
            <button className="btn btn-primary" onClick={onAddBuilding}>
              + Add Building
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeletons type="building" count={3} />
      ) : fetchedBuildings.length === 0 ? (
        <EmptyState
          icon="🏛"
          title="No buildings yet"
          description="Add a building to get started managing running room beds."
          action={isAdminLoggedIn && (
            <button className="btn btn-primary" onClick={onAddBuilding}>+ Add Building</button>
          )}
        />
      ) : (
        <div className="buildings-grid">
          {fetchedBuildings.map((building, i) => (
            <BuildingCard
              key={building._id || i}
              building={building}
              isAdminLoggedIn={isAdminLoggedIn}
              onViewBeds={isLoggedIn ? onViewBeds : undefined}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
