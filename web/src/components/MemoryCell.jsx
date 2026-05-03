function toHex(n, width = 8) {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(width, '0');
}
function toHexByte(n) { return (n & 0xff).toString(16).toUpperCase().padStart(2, '0'); }

const BYTES_PER_ROW = 8;

export function MemoryCell({ memBytes, memStart, pc }) {
  const rows = [];
  for (let i = 0; i < memBytes.length; i += BYTES_PER_ROW) {
    rows.push(memStart + i);
  }

  const isPC = (addr) => addr >= pc && addr < pc + 4;

  return (
    <div className="cell memory-cell">
      <div className="cell-header">
        <span className="cell-label">Memory</span>
        <span className="cell-badge">@{toHex(pc)}</span>
      </div>
      <div className="cell-body" style={{ padding: '8px 12px' }}>
        <div className="hex-dump">
          {rows.map((rowAddr, rowIdx) => {
            const bytes = [];
            for (let i = 0; i < BYTES_PER_ROW; i++) {
              bytes.push(memBytes[rowIdx * BYTES_PER_ROW + i] ?? 0);
            }
            const hasPC = bytes.some((_, i) => isPC(rowAddr + i));
            const ascii = bytes.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '·')).join('');

            return (
              <div key={rowAddr} className={`hex-row ${hasPC ? 'current-pc' : ''}`}>
                <span className="hex-addr">{toHex(rowAddr)}</span>
                <div className="hex-bytes">
                  {bytes.map((b, i) => (
                    <span key={i}>
                      {i === 4 && <span className="hex-spacer" />}
                      <span className={`hex-byte ${isPC(rowAddr + i) ? 'pc-byte' : b === 0 ? 'zero' : ''}`}>
                        {toHexByte(b)}
                      </span>
                    </span>
                  ))}
                </div>
                <span className="hex-ascii">{ascii}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
