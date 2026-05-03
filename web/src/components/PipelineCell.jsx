function toHex(n, width = 8) {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(width, '0');
}

export function PipelineCell({ rawWord, pc, opcode, operands, pipelineStage }) {
  const stages = [
    { name: 'FETCH',   icon: '⬇', val: rawWord != null ? toHex(pc) : '—' },
    { name: 'DECODE',  icon: '⚙', val: opcode ?? '—' },
    { name: 'EXECUTE', icon: '▶', val: operands || opcode || '—' },
  ];

  return (
    <div className="cell pipeline-cell">
      <div className="cell-header">
        <span className="cell-label">Pipeline</span>
        <span className="cell-badge">
          {rawWord != null ? `stage ${pipelineStage + 1}/3` : 'idle'}
        </span>
      </div>
      <div className="cell-body">
        <div className="pipeline-flow">
          {stages.map((s, i) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div className={`pipeline-stage ${i < pipelineStage ? 'done' : i === pipelineStage ? 'active' : ''}`}
                   style={{ flex: 1 }}>
                <span className="pipeline-stage-name">{s.name}</span>
                <span className="pipeline-icon">{s.icon}</span>
                <span className="pipeline-stage-val">{s.val}</span>
              </div>
              {i < 2 && <span className="pipeline-arrow">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
