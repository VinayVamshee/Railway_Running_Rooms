import React, { useState } from 'react';

export default function ReportsPage({ fetchedBuildings, onDownload }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');

  const buildingNames = [...new Set(fetchedBuildings.map(b => b.name))];

  const summary = (() => {
    let total = 0, checkedIn = 0, checkedOut = 0;
    fetchedBuildings.forEach(b => {
      if (buildingFilter && b.name !== buildingFilter) return;
      b.rooms.forEach(r =>
        r.logs.forEach(l => {
          const logDate = l.day ? new Date(l.day) : null;
          if (dateFrom && logDate && logDate < new Date(dateFrom)) return;
          if (dateTo && logDate && logDate > new Date(dateTo)) return;
          total++;
          if (l.outTime) checkedOut++;
          else checkedIn++;
        })
      );
    });
    return { total, checkedIn, checkedOut };
  })();

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Reports</h2>
            <p>Download and export arrival & departure data</p>
          </div>
          <button className="btn btn-success" onClick={onDownload}>
            ⬇ Download Excel Report
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="analytics-card">
          <div className="analytics-card-title">Filters</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Building</label>
              <select
                className="form-input"
                value={buildingFilter}
                onChange={e => setBuildingFilter(e.target.value)}
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <option value="">All Buildings</option>
                {buildingNames.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {(dateFrom || dateTo || buildingFilter) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); setBuildingFilter(''); }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-title">Report Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--purple-bg)', border: '1px solid var(--purple-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--purple)', textTransform: 'uppercase', marginBottom: 4 }}>Total Records</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{summary.total}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--green)', textTransform: 'uppercase', marginBottom: 3 }}>Checked In</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{summary.checkedIn}</div>
              </div>
              <div style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-border)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--blue)', textTransform: 'uppercase', marginBottom: 3 }}>Checked Out</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{summary.checkedOut}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          Export Full Report to Excel
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
          Downloads all arrival and departure records in XLSX format. The report includes building name, bed number, employee name, arrival time, and departure time.
        </div>
        <button className="btn btn-success" onClick={onDownload} style={{ margin: '0 auto' }}>
          ⬇ Download Arrival & Departure Report
        </button>
      </div>
    </div>
  );
}
