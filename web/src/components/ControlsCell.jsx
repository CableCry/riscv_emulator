import { useState } from 'react';

export function ControlsCell({ isHalted, animating, isRunning, cpuState, onStep, onRunN, onRun, onStop, onPause, onReset }) {
  const [runN, setRunN] = useState(10);
  const blocked = isHalted || animating || isRunning;

  return (
    <div className="cell" style={{ gridColumn: '1/3', gridRow: 'auto', flexDirection: 'row', alignItems: 'stretch' }}>
      <div
        className="cell-header"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 0,
          borderBottom: 'none',
          borderRight: '1px solid var(--border)',
          flexShrink: 0,
          padding: '0 14px',
          minWidth: 100,
          width: 100,
        }}
      >
        <span className="cell-label">Controls</span>
      </div>
      <div className="cell-body" style={{ flexDirection: 'row', padding: '0 14px' }}>
        <div className="controls-body">

          {/* Step */}
          <button className="ctrl-btn primary" onClick={onStep} disabled={blocked}>
            <span>▶</span> Step
          </button>

          <div className="ctrl-separator" />

          {/* Run × N */}
          <input
            className="ctrl-n-input"
            type="number"
            value={runN}
            min={1}
            max={100000}
            onChange={(e) => setRunN(e.target.value)}
          />
          <button className="ctrl-btn run-n" onClick={() => onRunN(parseInt(runN) || 10)} disabled={blocked}>
            Run ×{runN}
          </button>

          <div className="ctrl-separator" />

          {/* Run / Stop toggle */}
          {isRunning ? (
            <button className="ctrl-btn danger" onClick={onStop}>
              ⏹ Stop
            </button>
          ) : (
            <button className="ctrl-btn primary" onClick={onRun} disabled={isHalted || animating}>
              ▶▶ Run
            </button>
          )}

          <div className="ctrl-separator" />

          {/* Reset */}
          <button className="ctrl-btn danger" onClick={onReset}>
            ↺ Reset
          </button>

          <span className="ctrl-hint">
            <kbd>Space</kbd> to step
          </span>
        </div>
      </div>
    </div>
  );
}
