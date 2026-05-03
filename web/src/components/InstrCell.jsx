import { disassemble } from '../lib/disassemble.js';

const ECALL_WORD = 0x00000073;

function toHex(n, width = 8) {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(width, '0');
}

function Encoding({ word }) {
  return (
    <div className="instr-encoding">
      {(word >>> 0).toString(2).padStart(32, '0').match(/.{4}/g).join(' ')}
    </div>
  );
}

function Fields({ entries }) {
  return (
    <div className="instr-fields">
      {entries.map(([k, v, highlight]) => (
        <div key={k} className="instr-field">
          <span className="instr-field-label">{k}</span>
          <span
            className={`instr-field-value ${highlight === 'teal' ? 'teal' : ''}`}
            style={highlight === 'amber' ? { color: 'var(--amber)' } : undefined}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

function EcallResult({ a0 }) {
  const signed  = a0 | 0;
  const unsigned = a0 >>> 0;
  const hex     = toHex(a0);

  return (
    <>
      <div className="instr-address">
        raw <span style={{ color: 'var(--text2)' }}>{toHex(ECALL_WORD)}</span>
      </div>
      <div className="instr-main">
        <span className="instr-opcode">ECALL</span>
      </div>
      <Encoding word={ECALL_WORD} />
      <div className="instr-desc">
        Environment call — <strong>program returned to runtime</strong>
      </div>
      <Fields entries={[
        ['a0 (hex)',      hex,                  null],
        ['a0 (signed)',   signed.toString(),     'amber'],
        ['a0 (unsigned)', unsigned.toString(),   null],
      ]} />
    </>
  );
}

export function InstrCell({ rawWord, pc, cpuState, trapCause, a0 }) {
  const instr = rawWord != null ? disassemble(rawWord, pc) : null;
  const isEcallTrap = cpuState === 'trap' && trapCause === 'ECALL';

  // Determine badge: use instr type if available, otherwise synthesise for ECALL trap
  const badge = instr ? `${instr.type}-type` : (isEcallTrap ? 'E-type' : null);

  return (
    <div className="cell instr-cell">
      <div className="cell-header">
        <span className="cell-label accent">Current Instruction</span>
        {badge && <span className="cell-badge">{badge}</span>}
      </div>
      <div className="cell-body">
        {isEcallTrap ? (
          <EcallResult a0={a0} />
        ) : instr ? (
          <>
            <div className="instr-address">
              addr <span>{toHex(pc)}</span>
              &nbsp;&nbsp;raw <span style={{ color: 'var(--text2)' }}>{toHex(rawWord)}</span>
            </div>
            <div className="instr-main">
              <span className="instr-opcode">{instr.opcode}</span>
              {instr.operands && <span className="instr-operands">{instr.operands}</span>}
            </div>
            <Encoding word={rawWord} />
            <div
              className="instr-desc"
              dangerouslySetInnerHTML={{ __html: instr.desc }}
            />
            <Fields entries={Object.entries(instr.fields).map(([k, v]) => [k, v, k === 'rd' ? 'teal' : null])} />
          </>
        ) : (
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '13px',
            color: 'var(--text3)',
            margin: 'auto',
            textAlign: 'center',
          }}>
            {cpuState === 'trap' ? `⚠ Trap: ${trapCause}` : '— program halted —'}
          </div>
        )}
      </div>
    </div>
  );
}
