import React, { useEffect } from 'react';

export default function Drawer({ isOpen, onClose, title, subtitle, children, footer, width }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={width ? { width } : {}}>
        <div className="drawer-header">
          <div>
            <div className="drawer-header-title">{title}</div>
            {subtitle && <div className="drawer-header-sub">{subtitle}</div>}
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close drawer">✕</button>
        </div>
        <div className="drawer-body">
          {children}
        </div>
        {footer && (
          <div className="drawer-footer">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
