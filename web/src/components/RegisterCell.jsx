import { useState } from 'react';

const REG_ALIASES = [
  'zero','ra','sp','gp','tp','t0','t1','t2',
  's0','s1','a0','a1','a2','a3','a4','a5',
  'a6','a7','s2','s3','s4','s5','s6','s7',
  's8','s9','s10','s11','t3','t4','t5','t6',
];

function toHex(n) {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function toInt32(n) {
  return (n | 0);
}

export function RegisterCell({ registers, highlightReg, callStack }) {
  const [tab, setTab] = useState('regs');
  const [hoveredReg, setHoveredReg] = useState(null);

  return (
    <div className="cell reg-cell">
      <div className="cell-header">
        <span className="cell-label accent">Registers</span>
        <div className="cell-tabs">
          <button
            className={`cell-tab ${tab === 'regs' ? 'active' : ''}`}
            onClick={() => setTab('regs')}
          >
            Regs
          </button>
          <button
            className={`cell-tab ${tab === 'stack' ? 'active' : ''}`}
            onClick={() => setTab('stack')}
          >
            Call Stack {callStack.length > 0 && <span className="tab-badge">{callStack.length}</span>}
          </button>
        </div>
      </div>

      <div className="cell-body" style={{ padding: 0 }}>
        {tab === 'regs' ? (
          <div className="reg-grid">
            {registers.map((val, i) => {
              const signed = toInt32(val);
              const isHovered = hoveredReg === i;
              return (
                <div
                  key={i}
                  className={`reg-item ${i === highlightReg ? 'highlighted' : ''} ${val !== 0 ? 'nonzero' : ''}`}
                  onMouseEnter={() => setHoveredReg(i)}
                  onMouseLeave={() => setHoveredReg(null)}
                  title={`int32: ${signed}  uint32: ${val >>> 0}`}
                >
                  <span className="reg-name">x{i}</span>
                  <span className="reg-alias">{REG_ALIASES[i]}</span>
                  <span className="reg-value">
                    {isHovered && val !== 0
                      ? <span style={{ color: 'var(--amber)', fontSize: '8px' }}>{signed}</span>
                      : toHex(val)
                    }
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="callstack-panel">
            {callStack.length === 0 ? (
              <div className="callstack-empty">
                no call frames tracked<br />
                <span>step through JAL/RET to see the call stack</span>
              </div>
            ) : (
              <div className="callstack-list">
                {[...callStack].reverse().map((frame, i) => (
                  <div key={i} className={`callstack-frame ${i === 0 ? 'active' : ''}`}>
                    <div className="callstack-frame-name">{frame.name}</div>
                    <div className="callstack-frame-meta">
                      <span className="callstack-addr">{toHex(frame.targetAddr)}</span>
                      <span className="callstack-ret">→ ret {toHex(frame.returnAddr)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
