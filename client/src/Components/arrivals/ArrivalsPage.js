import React, { useState, useMemo } from 'react';
import EmptyState from '../common/EmptyState';

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'No OutDay') return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

const ITEMS_PER_PAGE = 10;

export default function ArrivalsPage({ fetchedBuildings, onDownload }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const allData = useMemo(() => {
    const data = [];
    fetchedBuildings.forEach(b =>
      b.rooms.forEach(r =>
        r.logs.forEach(l => {
          data.push({
            buildingName: b.name,
            roomNumber: r.roomNumber,
            roomName: r.roomName || `Bed ${r.roomNumber}`,
            name: l.name || 'No Name',
            day: l.day,
            inTime: l.inTime,
            outTime: l.outTime || null,
            outDay: l.outDay || null,
            isCheckedOut: !!l.outTime,
          });
        })
      )
    );
    data.sort((a, b) => {
      const da = new Date(`${a.day} ${a.inTime}`);
      const db = new Date(`${b.day} ${b.inTime}`);
      return db - da;
    });
    return data;
  }, [fetchedBuildings]);

  const filtered = useMemo(() => {
    return allData.filter(e => {
      const matchName = e.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = arrivalDate ? e.day === arrivalDate : true;
      const matchBuilding = buildingFilter ? e.buildingName === buildingFilter : true;
      return matchName && matchDate && matchBuilding;
    });
  }, [allData, searchTerm, arrivalDate, buildingFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const buildingNames = [...new Set(fetchedBuildings.map(b => b.name))];

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Arrivals & Departures</h2>
            <p>{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
          <button className="btn btn-success" onClick={onDownload}>
            ⬇ Download Report
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-filters">
          <input
            className="table-filter-input"
            type="text"
            placeholder="🔍 Search employee name"
            value={searchTerm}
            onChange={handleFilterChange(setSearchTerm)}
          />
          <input
            className="table-filter-input"
            type="date"
            value={arrivalDate}
            onChange={handleFilterChange(setArrivalDate)}
            title="Filter by arrival date"
          />
          <select
            className="table-filter-input"
            value={buildingFilter}
            onChange={handleFilterChange(setBuildingFilter)}
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <option value="">All Buildings</option>
            {buildingNames.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {(searchTerm || arrivalDate || buildingFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearchTerm(''); setArrivalDate(''); setBuildingFilter(''); setCurrentPage(1); }}
            >
              Clear
            </button>
          )}
        </div>

        {currentData.length === 0 ? (
          <EmptyState icon="📭" title="No records found" description="Try adjusting your filters." />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>Building</th>
                    <th>Bed</th>
                    <th>Arrival Date</th>
                    <th>Arrival Time</th>
                    <th>Departure Date</th>
                    <th>Departure Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((entry, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                      </td>
                      <td style={{ fontWeight: 500 }}>{entry.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{entry.buildingName}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{entry.roomName}</td>
                      <td>{formatDate(entry.day)}</td>
                      <td>{entry.inTime || '—'}</td>
                      <td>{formatDate(entry.outDay)}</td>
                      <td>{entry.outTime || '—'}</td>
                      <td>
                        {entry.isCheckedOut ? (
                          <span className="badge badge-blue">Checked Out</span>
                        ) : (
                          <span className="badge badge-green">Checked In</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span className="pagination-info">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div className="pagination-controls">
                <button className="page-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>← Prev</button>
                <span className="page-indicator">Page {currentPage} of {totalPages || 1}</span>
                <button className="page-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
