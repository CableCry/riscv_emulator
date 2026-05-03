const PT_LOAD = 1;

// Parse an ELF32 little-endian binary.
// Returns { entry, segments: [{vaddr, data}] } or null on failure.
export function parseElf32(uint8Array) {
  const v = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);

  // Check magic: 0x7F 'E' 'L' 'F'
  if (v.getUint32(0, false) !== 0x7f454c46) return null;
  // EI_CLASS = 1 (32-bit), EI_DATA = 1 (little-endian)
  if (uint8Array[4] !== 1 || uint8Array[5] !== 1) return null;

  const entry    = v.getUint32(24, true);
  const phoff    = v.getUint32(28, true);
  const phentsize = v.getUint16(42, true);
  const phnum    = v.getUint16(44, true);

  const segments = [];
  for (let i = 0; i < phnum; i++) {
    const base   = phoff + i * phentsize;
    const ptype  = v.getUint32(base + 0,  true);
    const poff   = v.getUint32(base + 4,  true);
    const vaddr  = v.getUint32(base + 8,  true);
    const filesz = v.getUint32(base + 16, true);
    const memsz  = v.getUint32(base + 20, true);

    if (ptype !== PT_LOAD || filesz === 0) continue;

    const data = new Uint8Array(memsz);
    data.set(uint8Array.subarray(poff, poff + filesz));
    segments.push({ vaddr, data });
  }

  return segments.length > 0 ? { entry, segments } : null;
}

// ECALL encoding (0x00000073)
export const ECALL_WORD = 0x00000073;

// Encode a JAL rd, offset instruction (rd in 0-31, offset must be even and in ±1MB)
export function encodeJal(rd, offset) {
  const imm = offset;
  const b20   = (imm >>> 20) & 0x1;
  const b1912 = (imm >>> 12) & 0xff;
  const b11   = (imm >>> 11) & 0x1;
  const b101  = (imm >>>  1) & 0x3ff;
  return (
    ((b20   & 0x1)   << 31) |
    ((b101  & 0x3ff) << 21) |
    ((b11   & 0x1)   << 20) |
    ((b1912 & 0xff)  << 12) |
    ((rd    & 0x1f)  <<  7) |
    0x6f
  ) >>> 0;
}
