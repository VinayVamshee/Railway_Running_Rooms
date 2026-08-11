import React, { useState, useMemo } from 'react';
import EmptyState from '../common/EmptyState';

function formatTime(hour) {
  const p = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:00 ${p}`;
}

export default function AnalyticsPage({ fetchedBuildings }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);

  const peakHours = useMemo(() => {
    const hourCounts = Array(24).fill(0);
    const selected = new Date(selectedDate);

    fetchedBuildings.forEach(b =>
      b.rooms.forEach(r =>
        r.logs.forEach(l => {
          const logDay = new Date(l.day);
          const logOutDay = l.outDay ? new Date(l.outDay) : null;
          if (selected >= logDay && (!logOutDay || selected <= logOutDay)) {
            const inHour = selected.toDateString() === logDay.toDateString()
              ? parseInt(l.inTime?.split(':')[0] || 0, 10) : 0;
            const outHour = logOutDay && selected.toDateString() === logOutDay.toDateString()
              ? parseInt(l.outTime?.split(':')[0] || 23, 10) : 23;
            for (let h = inHour; h <= outHour; h++) hourCounts[h]++;
          }
        })
      )
    );
    return hourCounts;
  }, [fetchedBuildings, selectedDate]);

  const maxPeak = Math.max(...peakHours, 1);

  const { dailyArrivals, monthlyAverage } = useMemo(() => {
    const selectedDt = new Date(selectedDay);
    let daily = 0;
    let monthly = 0;
    fetchedBuildings.forEach(b =>
      b.rooms.forEach(r =>
        r.logs.forEach(l => {
          const ld = new Date(l.day);
          if (ld.toDateString() === selectedDt.toDateString()) daily++;
          if (ld.getFullYear() === selectedDt.getFullYear() && ld.getMonth() === selectedDt.getMonth()) monthly++;
        })
      )
    );
    const daysInMonth = new Date(selectedDt.getFullYear(), selectedDt.getMonth() + 1, 0).getDate();
    return { dailyArrivals: daily, monthlyAverage: (monthly / daysInMonth).toFixed(2) };
  }, [fetchedBuildings, selectedDay]);

  const peakPeriod = useMemo(() => {
    const max = Math.max(...peakHours);
    const idx = peakHours.indexOf(max);
    return { count: max, time: formatTime(idx) };
  }, [peakHours]);

  return (
    <div className="page-enter">
      <div className="page-header">
        <h2>Analytics</h2>
        <p>Occupancy trends, peak times, and arrival statistics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Daily Arrivals</span><div className="stat-card-icon green">📅</div></div>
          <div className="stat-card-value">{dailyArrivals}</div>
          <div className="stat-card-sub">on {new Date(selectedDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Monthly Average</span><div className="stat-card-icon blue">📊</div></div>
          <div className="stat-card-value">{monthlyAverage}</div>
          <div className="stat-card-sub">arrivals/day this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Peak Occupancy</span><div className="stat-card-icon orange">⏰</div></div>
          <div className="stat-card-value">{peakPeriod.count}</div>
          <div className="stat-card-sub">beds at {peakPeriod.time}</div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Peak Hours Chart */}
        <div className="analytics-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="analytics-card-title">Peak Occupancy by Hour</div>
            <input
              type="date"
              className="table-filter-input"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ width: 'auto' }}
            />
          </div>
          <div className="peak-time-grid">
            {peakHours.map((count, hour) => (
              <div key={hour} className="peak-time-row">
                <span className="peak-time-label" style={{ minWidth: 72 }}>{formatTime(hour)}</span>
                <div className="peak-time-bar-wrap">
                  <div className="peak-time-bar" style={{ width: `${(count / maxPeak) * 100}%` }} />
                </div>
                <span className="peak-time-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily & Monthly Arrivals */}
        <div className="analytics-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="analytics-card-title">Arrivals Analysis</div>
            <input
              type="date"
              className="table-filter-input"
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value)}
              style={{ width: 'auto' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Selected Day</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{dailyArrivals}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>arrivals recorded</div>
            </div>
            <div style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Monthly Average</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{monthlyAverage}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>arrivals per day</div>
            </div>
          </div>
        </div>

        {/* Building-wise stats */}
        <div className="analytics-card">
          <div className="analytics-card-title">Building-wise Occupancy</div>
          {fetchedBuildings.length === 0 ? (
            <EmptyState icon="🏛" title="No data" description="Add buildings to see analytics." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {fetchedBuildings.map((b, i) => {
                const total = b.rooms.length;
                const occ = b.rooms.filter(r => {
                  const arr = r.logs.filter(l => l.inTime).length;
                  const dep = r.logs.filter(l => l.outTime).length;
                  return arr > dep;
                }).length;
                const pct = total > 0 ? Math.round((occ / total) * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{b.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{occ}/{total} beds</span>
                    </div>
                    <div className="progress-bar-wrap" style={{ height: 6 }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
