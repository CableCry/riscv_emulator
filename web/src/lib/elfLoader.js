const PT_LOAD = 1;
const SHT_SYMTAB = 2;
const SHT_STRTAB = 3;
const STB_LOCAL  = 0;
const STT_FUNC   = 2;
const STT_OBJECT = 1;

// Parse an ELF32 little-endian binary.
// Returns { entry, segments: [{vaddr, data}], symbols: Map<addr,name> } or null on failure.
export function parseElf32(uint8Array) {
  const v = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);

  // Check magic: 0x7F 'E' 'L' 'F'
  if (v.getUint32(0, false) !== 0x7f454c46) return null;
  // EI_CLASS = 1 (32-bit), EI_DATA = 1 (little-endian)
  if (uint8Array[4] !== 1 || uint8Array[5] !== 1) return null;

  const entry     = v.getUint32(24, true);
  const phoff     = v.getUint32(28, true);
  const shoff     = v.getUint32(32, true);
  const phentsize = v.getUint16(42, true);
  const phnum     = v.getUint16(44, true);
  const shentsize = v.getUint16(46, true);
  const shnum     = v.getUint16(48, true);
  const shstrndx  = v.getUint16(50, true);

  // ── Load segments ──────────────────────────────────────────────────────────
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

  if (segments.length === 0) return null;

  // ── Parse section headers for .symtab / .strtab ───────────────────────────
  const symbols = new Map();
  try {
    if (shoff && shnum && shentsize) {
      // Collect all section headers
      const shdrs = [];
      for (let i = 0; i < shnum; i++) {
        const b = shoff + i * shentsize;
        shdrs.push({
          type:   v.getUint32(b + 4,  true),
          offset: v.getUint32(b + 16, true),
          size:   v.getUint32(b + 20, true),
          link:   v.getUint32(b + 24, true), // index of associated strtab
        });
      }

      for (let si = 0; si < shdrs.length; si++) {
        if (shdrs[si].type !== SHT_SYMTAB) continue;
        const sym = shdrs[si];
        const str = shdrs[sym.link];
        if (!str || str.type !== SHT_STRTAB) continue;

        const dec = new TextDecoder();
        const strData = uint8Array.subarray(str.offset, str.offset + str.size);
        const ENTRY_SZ = 16; // Elf32_Sym size
        const count = Math.floor(sym.size / ENTRY_SZ);

        for (let j = 0; j < count; j++) {
          const eb    = sym.offset + j * ENTRY_SZ;
          const nameOff = v.getUint32(eb + 0,  true);
          const value   = v.getUint32(eb + 4,  true);
          const info    = uint8Array[eb + 12];
          const stype   = info & 0xf;
          const sbind   = info >> 4;

          if (value === 0) continue;
          if (stype !== STT_FUNC && stype !== STT_OBJECT && stype !== 0) continue;
          // Find null-terminated name
          let end = nameOff;
          while (end < strData.length && strData[end] !== 0) end++;
          const name = dec.decode(strData.subarray(nameOff, end));
          if (name && name !== '$d' && name !== '$t') {
            symbols.set(value >>> 0, name);
          }
        }
      }
    }
  } catch (_) { /* silently ignore malformed symbol tables */ }

  return { entry, segments, symbols };
}

// ECALL encoding (0x00000073)
export const ECALL_WORD = 0x00000073;

// Must match MEM_SIZE in cpu.h
export const MEM_SIZE = 1024 * 1024; // 1 MB

// Encode a LUI rd, upperImm instruction  (result: rd = upperImm << 12)
export function encodeLui(rd, upperImm) {
  return (((upperImm & 0xFFFFF) << 12) | ((rd & 0x1F) << 7) | 0x37) >>> 0;
}

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
