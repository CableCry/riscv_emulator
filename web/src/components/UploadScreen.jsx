import { useRef, useState } from 'react';

export function UploadScreen({ onFile }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onFile(file.name, new Uint8Array(e.target.result));
    reader.readAsArrayBuffer(file);
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

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      >
        <div className="upload-zone-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="18" width="24" height="16" rx="0" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M20 4 L20 20 M14 10 L20 4 L26 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
        </div>
        <div className="upload-zone-label">
          Drop a RISC-V binary or ELF file here
          <span>.bin · .elf · .hex — or click to browse</span>
        </div>
        <button
          className="upload-btn"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
        >
          Choose File
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".bin,.elf,.hex"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}
