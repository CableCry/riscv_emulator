export function Header({ filename, cpuState, trapCause, onUnload }) {
  const statusLabel = cpuState === 'running' ? 'Running' : cpuState === 'trap' ? 'Trap' : 'Halted';

  return (
    <div className="header">
      <div className="header-logo">RV32I</div>
      <div className="header-file"><strong>{filename}</strong></div>
      <div className={`status-pill ${cpuState}`}>
        <span className="status-dot" />
        {statusLabel}
        {cpuState === 'trap' && (
          <span style={{ color: 'var(--text3)', marginLeft: 4, fontSize: '9px' }}>{trapCause}</span>
        )}
      </div>
      <button className="header-btn danger" onClick={onUnload}>Unload</button>
    </div>
  );
}
