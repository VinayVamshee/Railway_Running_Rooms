import React from 'react';

export default function ConfirmDialog({ title, message, onConfirm, onCancel, type = 'danger', confirmLabel = 'Confirm', cancelLabel = 'Cancel' }) {
  const icons = { danger: '🗑️', warning: '⚠️' };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ padding: '28px 24px', gap: '12px' }}>
          <div className={`confirm-icon ${type}`}>
            {icons[type] || icons.warning}
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {title}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {message}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
