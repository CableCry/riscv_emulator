import { useState } from 'react';
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

function HelpPanel({ manual, onClose }) {
  return (
    <div className="instr-help-panel">
      <div className="instr-help-header">
        <span className="instr-help-title">Instruction Reference</span>
        <button className="instr-help-close" onClick={onClose}>✕</button>
      </div>
      <p className="instr-help-synopsis">{manual.synopsis}</p>
      {manual.operands?.length > 0 && (
        <>
          <div className="instr-help-section-label">Operands</div>
          <div className="instr-help-operands">
            {manual.operands.map(({ label, name, desc }) => (
              <div key={label} className="instr-help-operand">
                <div className="instr-help-operand-name">
                  <span className="instr-help-label">{label}</span>
                  {name !== label && <span className="instr-help-alias">{name}</span>}
                </div>
                <span className="instr-help-desc">{desc}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EcallResult({ a0 }) {
  const signed   = a0 | 0;
  const unsigned = a0 >>> 0;
  const hex      = toHex(a0);
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

export function InstrCell({ rawWord, pc, cpuState, trapCause, a0, symbolName }) {
  const [showHelp, setShowHelp] = useState(false);
  const instr = rawWord != null ? disassemble(rawWord, pc) : null;
  const isEcallTrap = cpuState === 'trap' && trapCause === 'ECALL';
  const badge = instr ? `${instr.type}-type` : (isEcallTrap ? 'E-type' : null);

  return (
    <div className="cell instr-cell">
      <div className="cell-header">
        <span className="cell-label accent">Current Instruction</span>
        {badge && <span className="cell-badge">{badge}</span>}
      </div>
      <div className="cell-body" style={{ position: 'relative' }}>
        {isEcallTrap ? (
          <EcallResult a0={a0} />
        ) : instr ? (
          <>
            <div className="instr-address">
              addr <span>{toHex(pc)}</span>
              {symbolName && <span className="instr-symbol">&lt;{symbolName}&gt;</span>}
              &nbsp;&nbsp;raw <span style={{ color: 'var(--text2)' }}>{toHex(rawWord)}</span>
            </div>

            {/* Clickable opcode row */}
            <div
              className={`instr-main instr-main-clickable ${showHelp ? 'help-open' : ''}`}
              onClick={() => setShowHelp(s => !s)}
              title="Click for instruction reference"
            >
              <span className="instr-opcode">{instr.opcode}</span>
              {instr.operands && <span className="instr-operands">{instr.operands}</span>}
              <span className="instr-help-toggle">{showHelp ? '×' : 'ⓘ'}</span>
            </div>

            <Encoding word={rawWord} />
            <div
              className="instr-desc"
              dangerouslySetInnerHTML={{ __html: instr.desc }}
            />
            <Fields entries={Object.entries(instr.fields).map(([k, v]) => [k, v, k === 'rd' ? 'teal' : null])} />

            {/* Help overlay — sits on top of encoding/desc/fields */}
            {showHelp && instr.manual && (
              <HelpPanel manual={instr.manual} onClose={() => setShowHelp(false)} />
            )}
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
