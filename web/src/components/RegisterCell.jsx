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
  return (n | 0); // reinterpret as signed
}

export function RegisterCell({ registers, highlightReg }) {
  const [hoveredReg, setHoveredReg] = useState(null);

  return (
    <div className="cell reg-cell">
      <div className="cell-header">
        <span className="cell-label accent">Registers</span>
        <span className="cell-badge">RV32I · x0–x31</span>
      </div>
      <div className="cell-body" style={{ padding: 0 }}>
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
      </div>
    </div>
  );
}
