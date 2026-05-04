import { useRef, useState } from 'react';
import { DEMOS } from '../lib/demos.js';

const TAG_COLORS = {
  arithmetic: { color: 'var(--teal)',  border: 'var(--teal-dim)'  },
  recursion:  { color: 'var(--amber)', border: 'var(--amber-dim)' },
  rv32m:      { color: 'var(--red)',   border: 'var(--red-dim)'   },
};

export function UploadScreen({ onFile }) {
  const [dragOver, setDragOver] = useState(false);
  const [showDemos, setShowDemos] = useState(false);
  const [loading, setLoading] = useState(null); // demo id being fetched
  const fileInputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onFile(file.name, new Uint8Array(e.target.result));
    reader.readAsArrayBuffer(file);
  }

  async function loadDemo(demo) {
    setLoading(demo.id);
    try {
      const res = await fetch(demo.file);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      onFile(demo.name + '.elf', new Uint8Array(buf));
    } catch (e) {
      console.error('Failed to load demo:', e);
      setLoading(null);
    }
  }

  return (
    <div
      className={`upload-screen ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
    >
      <div className="upload-logo">
        <div className="upload-logo-mark">RV32</div>
        <div className="upload-logo-title">RISC-V Emulator</div>
      </div>

      {!showDemos ? (
        <>
          {/* ── Upload zone ── */}
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          >
            <div className="upload-zone-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="8" y="18" width="24" height="16" stroke="currentColor" strokeWidth="1.5" />
                <path d="M20 4 L20 20 M14 10 L20 4 L26 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </div>
            <div className="upload-zone-label">
              Drop a RISC-V binary or ELF file here
              <span>.elf — or click to browse</span>
            </div>
            <button
              className="upload-btn"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Choose File
            </button>
          </div>

          {/* ── Demo shortcut ── */}
          <button className="demo-shortcut-btn" onClick={() => setShowDemos(true)}>
            <span className="demo-shortcut-icon">▶</span>
            Try a demo program
          </button>
        </>
      ) : (
        /* ── Demo picker ── */
        <div className="demo-picker">
          <div className="demo-picker-header">
            <span className="demo-picker-title">Demo Programs</span>
            <button className="demo-picker-back" onClick={() => setShowDemos(false)}>
              ← back
            </button>
          </div>

          <div className="demo-grid">
            {DEMOS.map((demo) => {
              const tagStyle = TAG_COLORS[demo.tag] ?? { color: 'var(--text2)', border: 'var(--border2)' };
              const isLoading = loading === demo.id;
              return (
                <button
                  key={demo.id}
                  className={`demo-card ${isLoading ? 'loading' : ''}`}
                  onClick={() => loadDemo(demo)}
                  disabled={loading !== null}
                >
                  <div className="demo-card-top">
                    <span className="demo-card-name">{demo.name}</span>
                    <span
                      className="demo-card-tag"
                      style={{ color: tagStyle.color, borderColor: tagStyle.border }}
                    >
                      {demo.tag}
                    </span>
                  </div>

                  <p className="demo-card-desc">{demo.description}</p>

                  <pre className="demo-card-source">{demo.source}</pre>

                  <div className="demo-card-footer">
                    <span className="demo-card-expected">
                      returns <strong>{demo.expected}</strong>
                    </span>
                    <span className="demo-card-action">
                      {isLoading ? 'loading…' : 'Load & Run →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".bin,.elf,.hex"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      <div className="upload-hint">RV32I · bare-metal ELF</div>
    </div>
  );
}
