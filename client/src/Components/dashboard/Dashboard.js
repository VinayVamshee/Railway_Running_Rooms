import React, { useMemo } from 'react';
import StatCard from './StatCard';
import { LoadingSkeletons } from '../common/EmptyState';

function calculateAvailableRooms(rooms) {
  return rooms.filter(room => {
    const isOccupied = room.logs && room.logs.some(l => l.inTime && !l.outTime);
    return !isOccupied && room.active !== false;
  }).length;
}

function getTodayStats(fetchedBuildings) {
  const today = new Date().toDateString();
  let arrivals = 0, departures = 0;

  fetchedBuildings.forEach(b =>
    b.rooms.forEach(r =>
      r.logs.forEach(l => {
        if (l.day && new Date(l.day).toDateString() === today) arrivals++;
        if (l.outDay && new Date(l.outDay).toDateString() === today) departures++;
      })
    )
  );
  return { arrivals, departures };
}

function getPeakOccupancyToday(fetchedBuildings) {
  const today = new Date();
  const hourCounts = Array(24).fill(0);

  fetchedBuildings.forEach(b =>
    b.rooms.forEach(r =>
      r.logs.forEach(l => {
        const logDay = l.day ? new Date(l.day) : null;
        const outDay = l.outDay ? new Date(l.outDay) : null;
        if (!logDay) return;

        const todayStr = today.toDateString();
        if (!(today >= logDay && (!outDay || today <= outDay))) return;

        const inHour = logDay.toDateString() === todayStr ? parseInt(l.inTime?.split(':')[0] || 0, 10) : 0;
        const outHour = outDay?.toDateString() === todayStr ? parseInt(l.outTime?.split(':')[0] || 23, 10) : 23;
        for (let h = inHour; h <= outHour; h++) hourCounts[h]++;
      })
    )
  );

  const max = Math.max(...hourCounts);
  const peakHr = hourCounts.indexOf(max);
  const fmt = (h) => { const p = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:00 ${p}`; };
  return { peak: max, time: fmt(peakHr) };
}

export default function Dashboard({ fetchedBuildings, loading, isLoggedIn, onNavigate }) {
  const stats = useMemo(() => {
    if (!fetchedBuildings.length) return { total: 0, occupied: 0, available: 0, pct: 0 };
    const total = fetchedBuildings.reduce((a, b) => a + b.rooms.filter(r => r.active !== false).length, 0);
    const available = fetchedBuildings.reduce((a, b) => a + calculateAvailableRooms(b.rooms), 0);
    const occupied = total - available;
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, available, pct };
  }, [fetchedBuildings]);

  const today = useMemo(() => getTodayStats(fetchedBuildings), [fetchedBuildings]);
  const peak = useMemo(() => getPeakOccupancyToday(fetchedBuildings), [fetchedBuildings]);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Dashboard</h2>
            <p>Real-time overview of all running room operations</p>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSkeletons type="stat" count={4} />
      ) : (
        <div className="stat-cards-grid">
          <StatCard
            label="Total Beds"
            value={stats.total}
            icon="🛏"
            iconColor="purple"
            sub={`Across ${fetchedBuildings.length} building${fetchedBuildings.length !== 1 ? 's' : ''}`}
          />
          <StatCard
            label="Occupied"
            value={stats.occupied}
            icon="👤"
            iconColor="orange"
            sub={`${stats.pct}% of total capacity`}
          />
          <StatCard
            label="Available"
            value={stats.available}
            icon="✓"
            iconColor="green"
            sub="Ready for check-in"
          />
          <StatCard
            label="Occupancy"
            value={`${stats.pct}%`}
            icon="📊"
            iconColor="blue"
            sub={stats.pct > 80 ? 'High load' : stats.pct > 50 ? 'Moderate load' : 'Low load'}
          />
        </div>
      )}

      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-title">Today's Activity</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="activity-grid">
        <div className="activity-card">
          <div className="activity-card-label">Arrivals Today</div>
          <div className="activity-card-value" style={{ color: 'var(--green)' }}>{today.arrivals}</div>
        </div>
        <div className="activity-card">
          <div className="activity-card-label">Departures Today</div>
          <div className="activity-card-value" style={{ color: 'var(--blue)' }}>{today.departures}</div>
        </div>
        <div className="activity-card">
          <div className="activity-card-label">Peak Occupancy (Today)</div>
          <div className="activity-card-value">{peak.peak}</div>
        </div>
        <div className="activity-card">
          <div className="activity-card-label">Peak Time (Today)</div>
          <div className="activity-card-value" style={{ fontSize: 16 }}>{peak.time}</div>
        </div>
      </div>

      {!isLoggedIn && (
        <div style={{
          marginTop: 24,
          background: 'var(--purple-bg)',
          border: '1px solid var(--purple-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            Sign in to view bed availability
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Authentication is required to see and manage bed assignments.
          </div>
        </div>
      )}

      {isLoggedIn && fetchedBuildings.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 28 }}>
            <span className="section-title">Buildings Overview</span>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('buildings')}>
              View All →
            </button>
          </div>
          <div className="buildings-grid">
            {fetchedBuildings.slice(0, 4).map((b, i) => {
              const avail = calculateAvailableRooms(b.rooms);
              const total = b.rooms.length;
              const occ = total - avail;
              const pct = total > 0 ? Math.round((occ / total) * 100) : 0;
              return (
                <div key={i} className="building-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('buildings')}>
                  <div className="building-card-header">
                    <div>
                      <div className="building-card-name">{b.name}</div>
                      <div className="building-card-type">Running Room</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="building-stats">
                    <span className="building-stat"><span className="stat-dot occupied" />{occ} Occupied</span>
                    <span className="building-stat"><span className="stat-dot available" />{avail} Free</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
