import { useState, useEffect, useRef } from 'react';

function toHex(n, width = 8) {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(width, '0');
}

export function StatsCell({ pc, cycle, cpuState, trapCause, log }) {
  const [tab, setTab] = useState('stats');
  const logEndRef = useRef(null);
  const statusLabel = cpuState === 'running' ? 'Running' : cpuState === 'trap' ? 'Trap' : 'Halted';

  // Auto-scroll log to bottom when new entries arrive
  useEffect(() => {
    if (tab === 'log' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [log, tab]);

  return (
    <div className="cell stats-cell">
      <div className="cell-header">
        <span className="cell-label">CPU State</span>
        <div className="cell-tabs">
          <button
            className={`cell-tab ${tab === 'stats' ? 'active' : ''}`}
            onClick={() => setTab('stats')}
          >
            Stats
          </button>
          <button
            className={`cell-tab ${tab === 'log' ? 'active' : ''}`}
            onClick={() => setTab('log')}
          >
            Log {log?.length > 0 && <span className="tab-badge">{log.length}</span>}
          </button>
        </div>
      </div>
      <div className="cell-body" style={{ padding: 0 }}>
        {tab === 'stats' ? (
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
        ) : (
          <div className="log-panel">
            {!log || log.length === 0 ? (
              <div className="log-empty">
                no entries yet — step through instructions to see the log
              </div>
            ) : (
              <div className="log-list">
                {log.map((entry, i) => (
                  <div key={i} className="log-entry">
                    <span className="log-cycle">#{entry.cycle}</span>
                    <span className="log-pc">{toHex(entry.pc)}</span>
                    <span className="log-instr">{entry.instrStr}</span>
                    {entry.regChanged && (
                      <span className="log-reg">{entry.regChanged}</span>
                    )}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
