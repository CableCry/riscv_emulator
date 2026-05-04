import { useState, useRef, useEffect } from 'react';
import { assemble } from '../lib/assembler.js';

const DEFAULT_SOURCE = `# RV32I inline assembler
# Labels, pseudo-instructions, and RV32M are supported.
# Code loads at address 0x00000000 and starts from the first instruction.

    addi  a0, zero, 21   # a0 = 21
    addi  a1, zero, 21   # a1 = 21
    add   a0, a0, a1     # a0 = 42
    ecall                # halt — result in a0
`;

export function AssemblerPanel({ onLoad, onClose }) {
  const [source, setSource]   = useState(DEFAULT_SOURCE);
  const [errors, setErrors]   = useState([]);
  const [words, setWords]     = useState(null);   // Uint32Array from last assemble
  const [assembled, setAssembled] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function doAssemble() {
    const result = assemble(source, 0);
    setErrors(result.errors);
    if (result.errors.length === 0) {
      setWords(result.words);
      setAssembled(true);
    } else {
      setWords(null);
      setAssembled(false);
    }
  }

  function doLoad() {
    if (!words || words.length === 0) return;
    // Convert Uint32Array → little-endian Uint8Array
    const bytes = new Uint8Array(words.length * 4);
    const dv = new DataView(bytes.buffer);
    for (let i = 0; i < words.length; i++) {
      dv.setUint32(i * 4, words[i], true);
    }
    onLoad(bytes, 'assembled.bin');
  }

  function doAssembleAndLoad() {
    const result = assemble(source, 0);
    setErrors(result.errors);
    if (result.errors.length === 0) {
      setWords(result.words);
      setAssembled(true);
      const bytes = new Uint8Array(result.words.length * 4);
      const dv = new DataView(bytes.buffer);
      for (let i = 0; i < result.words.length; i++) {
        dv.setUint32(i * 4, result.words[i], true);
      }
      onLoad(bytes, 'assembled.bin');
    } else {
      setWords(null);
      setAssembled(false);
    }
  }

  const wordCount = words?.length ?? 0;

  return (
    <div className="asm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="asm-panel">
        {/* Header */}
        <div className="asm-header">
          <div className="asm-header-left">
            <span className="asm-title">Inline Assembler</span>
            <span className="asm-badge">RV32I · RV32M · Pseudos</span>
          </div>
          <button className="asm-close" onClick={onClose}>✕</button>
        </div>

        {/* Editor */}
        <div className="asm-editor-wrap">
          <textarea
            ref={textareaRef}
            className="asm-editor"
            value={source}
            onChange={(e) => { setSource(e.target.value); setAssembled(false); setErrors([]); }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="asm-errors">
            {errors.map((e, i) => (
              <div key={i} className="asm-error-line">⚠ {e}</div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="asm-footer">
          {assembled && wordCount > 0 && (
            <span className="asm-info">
              {wordCount} instruction{wordCount !== 1 ? 's' : ''} · {wordCount * 4} bytes
            </span>
          )}
          <div className="asm-actions">
            <button className="ctrl-btn secondary" onClick={doAssemble}>
              ✓ Assemble
            </button>
            <button
              className="ctrl-btn primary"
              onClick={doAssembleAndLoad}
            >
              ▶ Assemble &amp; Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
