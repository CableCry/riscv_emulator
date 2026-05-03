function toHex(n, width = 8) {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(width, '0');
}

export function StatsCell({ pc, cycle, cpuState, trapCause }) {
  const statusLabel = cpuState === 'running' ? 'Running' : cpuState === 'trap' ? 'Trap' : 'Halted';

  return (
    <div className="cell stats-cell">
      <div className="cell-header">
        <span className="cell-label">CPU State</span>
      </div>
      <div className="cell-body" style={{ padding: 0 }}>
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">Program Counter</span>
            <span className="stat-value teal" style={{ fontSize: '16px', letterSpacing: '0.04em' }}>
              {toHex(pc)}
            </span>
            <span className="stat-sub">instruction address</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Cycles</span>
            <span className="stat-value">{cycle}</span>
            <span className="stat-sub">executed</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">CPU Status</span>
            <span className={`stat-value ${cpuState === 'running' ? 'teal' : cpuState === 'trap' ? 'red' : ''}`}>
              {statusLabel.toUpperCase()}
            </span>
            <span className="stat-sub">state machine</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Trap Cause</span>
            <span
              className={`stat-value ${cpuState === 'trap' ? 'red' : ''}`}
              style={{ fontSize: '12px', marginTop: 4 }}
            >
              {cpuState === 'trap' ? trapCause : '—'}
            </span>
            <span className="stat-sub">mcause</span>
          </div>
        </div>
      </div>
    </div>
  );
}
