// Two-pass RV32I assembler
// assemble(source, baseAddr) → { words: Uint32Array, errors: string[], labels: Map<string,number> }

const REG_MAP = {
  zero:0, ra:1, sp:2, gp:3, tp:4,
  t0:5, t1:6, t2:7,
  s0:8, fp:8, s1:9,
  a0:10, a1:11, a2:12, a3:13, a4:14, a5:15, a6:16, a7:17,
  s2:18, s3:19, s4:20, s5:21, s6:22, s7:23,
  s8:24, s9:25, s10:26, s11:27,
  t3:28, t4:29, t5:30, t6:31,
};
for (let i = 0; i < 32; i++) REG_MAP[`x${i}`] = i;

function reg(s) {
  const n = REG_MAP[s.trim().toLowerCase()];
  if (n === undefined) throw new Error(`Unknown register: ${s}`);
  return n;
}

function parseImm(s, labels, pc) {
  s = s.trim();
  if (labels && labels.has(s)) return labels.get(s) - pc;
  if (/^-?0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (labels && labels.has(s)) return labels.get(s);
  throw new Error(`Unknown immediate/label: ${s}`);
}

function parseAbsImm(s, labels) {
  s = s.trim();
  if (labels && labels.has(s)) return labels.get(s);
  if (/^-?0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  throw new Error(`Unknown immediate/label: ${s}`);
}

// offset(reg) → [offset, reg]
function parseMemOp(s) {
  const m = s.trim().match(/^(-?(?:0x[0-9a-f]+|\d+))\((\w+)\)$/i);
  if (!m) throw new Error(`Bad mem operand: ${s}`);
  return [parseInt(m[1], /^0x/i.test(m[1]) ? 16 : 10), reg(m[2])];
}

function sext(v, bits) {
  const shift = 32 - bits;
  return (v << shift) >> shift;
}

function encR(opcode, funct3, funct7, rd, rs1, rs2) {
  return ((funct7 & 0x7f) << 25) | ((rs2 & 0x1f) << 20) | ((rs1 & 0x1f) << 15) |
    ((funct3 & 7) << 12) | ((rd & 0x1f) << 7) | (opcode & 0x7f);
}
function encI(opcode, funct3, rd, rs1, imm) {
  return ((imm & 0xfff) << 20) | ((rs1 & 0x1f) << 15) | ((funct3 & 7) << 12) |
    ((rd & 0x1f) << 7) | (opcode & 0x7f);
}
function encS(opcode, funct3, rs1, rs2, imm) {
  return (((imm >> 5) & 0x7f) << 25) | ((rs2 & 0x1f) << 20) | ((rs1 & 0x1f) << 15) |
    ((funct3 & 7) << 12) | ((imm & 0x1f) << 7) | (opcode & 0x7f);
}
function encB(opcode, funct3, rs1, rs2, imm) {
  const b12  = (imm >> 12) & 1;
  const b11  = (imm >> 11) & 1;
  const b105 = (imm >> 5)  & 0x3f;
  const b41  = (imm >> 1)  & 0xf;
  return (b12 << 31) | (b105 << 25) | ((rs2 & 0x1f) << 20) | ((rs1 & 0x1f) << 15) |
    ((funct3 & 7) << 12) | (b41 << 8) | (b11 << 7) | (opcode & 0x7f);
}
function encU(opcode, rd, imm) {
  return (imm & 0xfffff000) | ((rd & 0x1f) << 7) | (opcode & 0x7f);
}
function encJ(opcode, rd, imm) {
  const b20   = (imm >> 20) & 1;
  const b1912 = (imm >> 12) & 0xff;
  const b11   = (imm >> 11) & 1;
  const b101  = (imm >> 1)  & 0x3ff;
  return (b20 << 31) | (b101 << 21) | (b11 << 20) | (b1912 << 12) |
    ((rd & 0x1f) << 7) | (opcode & 0x7f);
}

// Assemble a single instruction line, returns a 32-bit word
function assembleInstr(mnemonic, args, labels, pc) {
  const m = mnemonic.toUpperCase();

  // Helper to get N comma-separated operand tokens
  function ops(n) {
    const parts = args.split(',').map(s => s.trim());
    if (parts.length !== n) throw new Error(`Expected ${n} operands, got ${parts.length}`);
    return parts;
  }
  function ops2plus() {
    // Split only on the first (n-1) commas
    return args.split(',').map(s => s.trim());
  }

  switch (m) {
    // ── R-type ────────────────────────────────────────────────────────────────
    case 'ADD':  { const [d,s1,s2]=ops(3); return encR(0x33,0x0,0x00,reg(d),reg(s1),reg(s2)); }
    case 'SUB':  { const [d,s1,s2]=ops(3); return encR(0x33,0x0,0x20,reg(d),reg(s1),reg(s2)); }
    case 'SLL':  { const [d,s1,s2]=ops(3); return encR(0x33,0x1,0x00,reg(d),reg(s1),reg(s2)); }
    case 'SLT':  { const [d,s1,s2]=ops(3); return encR(0x33,0x2,0x00,reg(d),reg(s1),reg(s2)); }
    case 'SLTU': { const [d,s1,s2]=ops(3); return encR(0x33,0x3,0x00,reg(d),reg(s1),reg(s2)); }
    case 'XOR':  { const [d,s1,s2]=ops(3); return encR(0x33,0x4,0x00,reg(d),reg(s1),reg(s2)); }
    case 'SRL':  { const [d,s1,s2]=ops(3); return encR(0x33,0x5,0x00,reg(d),reg(s1),reg(s2)); }
    case 'SRA':  { const [d,s1,s2]=ops(3); return encR(0x33,0x5,0x20,reg(d),reg(s1),reg(s2)); }
    case 'OR':   { const [d,s1,s2]=ops(3); return encR(0x33,0x6,0x00,reg(d),reg(s1),reg(s2)); }
    case 'AND':  { const [d,s1,s2]=ops(3); return encR(0x33,0x7,0x00,reg(d),reg(s1),reg(s2)); }
    // RV32M
    case 'MUL':    { const [d,s1,s2]=ops(3); return encR(0x33,0x0,0x01,reg(d),reg(s1),reg(s2)); }
    case 'MULH':   { const [d,s1,s2]=ops(3); return encR(0x33,0x1,0x01,reg(d),reg(s1),reg(s2)); }
    case 'MULHSU': { const [d,s1,s2]=ops(3); return encR(0x33,0x2,0x01,reg(d),reg(s1),reg(s2)); }
    case 'MULHU':  { const [d,s1,s2]=ops(3); return encR(0x33,0x3,0x01,reg(d),reg(s1),reg(s2)); }
    case 'DIV':    { const [d,s1,s2]=ops(3); return encR(0x33,0x4,0x01,reg(d),reg(s1),reg(s2)); }
    case 'DIVU':   { const [d,s1,s2]=ops(3); return encR(0x33,0x5,0x01,reg(d),reg(s1),reg(s2)); }
    case 'REM':    { const [d,s1,s2]=ops(3); return encR(0x33,0x6,0x01,reg(d),reg(s1),reg(s2)); }
    case 'REMU':   { const [d,s1,s2]=ops(3); return encR(0x33,0x7,0x01,reg(d),reg(s1),reg(s2)); }

    // ── I-type ALU ────────────────────────────────────────────────────────────
    case 'ADDI':  { const [d,s,i]=ops(3); return encI(0x13,0x0,reg(d),reg(s),parseAbsImm(i,labels)); }
    case 'SLTI':  { const [d,s,i]=ops(3); return encI(0x13,0x2,reg(d),reg(s),parseAbsImm(i,labels)); }
    case 'SLTIU': { const [d,s,i]=ops(3); return encI(0x13,0x3,reg(d),reg(s),parseAbsImm(i,labels)); }
    case 'XORI':  { const [d,s,i]=ops(3); return encI(0x13,0x4,reg(d),reg(s),parseAbsImm(i,labels)); }
    case 'ORI':   { const [d,s,i]=ops(3); return encI(0x13,0x6,reg(d),reg(s),parseAbsImm(i,labels)); }
    case 'ANDI':  { const [d,s,i]=ops(3); return encI(0x13,0x7,reg(d),reg(s),parseAbsImm(i,labels)); }
    case 'SLLI':  { const [d,s,i]=ops(3); return encI(0x13,0x1,reg(d),reg(s),parseAbsImm(i,labels)&0x1f); }
    case 'SRLI':  { const [d,s,i]=ops(3); return encI(0x13,0x5,reg(d),reg(s),parseAbsImm(i,labels)&0x1f); }
    case 'SRAI':  { const [d,s,i]=ops(3); return encI(0x13,0x5,reg(d),reg(s),(parseAbsImm(i,labels)&0x1f)|0x400); }

    // ── Loads ─────────────────────────────────────────────────────────────────
    case 'LB':  { const [d,mo]=ops(2); const [off,b]=parseMemOp(mo); return encI(0x03,0x0,reg(d),b,off); }
    case 'LH':  { const [d,mo]=ops(2); const [off,b]=parseMemOp(mo); return encI(0x03,0x1,reg(d),b,off); }
    case 'LW':  { const [d,mo]=ops(2); const [off,b]=parseMemOp(mo); return encI(0x03,0x2,reg(d),b,off); }
    case 'LBU': { const [d,mo]=ops(2); const [off,b]=parseMemOp(mo); return encI(0x03,0x4,reg(d),b,off); }
    case 'LHU': { const [d,mo]=ops(2); const [off,b]=parseMemOp(mo); return encI(0x03,0x5,reg(d),b,off); }

    // ── Stores ────────────────────────────────────────────────────────────────
    case 'SB': { const [s2,mo]=ops(2); const [off,b]=parseMemOp(mo); return encS(0x23,0x0,b,reg(s2),off); }
    case 'SH': { const [s2,mo]=ops(2); const [off,b]=parseMemOp(mo); return encS(0x23,0x1,b,reg(s2),off); }
    case 'SW': { const [s2,mo]=ops(2); const [off,b]=parseMemOp(mo); return encS(0x23,0x2,b,reg(s2),off); }

    // ── Branches ──────────────────────────────────────────────────────────────
    case 'BEQ':  { const [s1,s2,lbl]=ops(3); return encB(0x63,0x0,reg(s1),reg(s2),parseImm(lbl,labels,pc)); }
    case 'BNE':  { const [s1,s2,lbl]=ops(3); return encB(0x63,0x1,reg(s1),reg(s2),parseImm(lbl,labels,pc)); }
    case 'BLT':  { const [s1,s2,lbl]=ops(3); return encB(0x63,0x4,reg(s1),reg(s2),parseImm(lbl,labels,pc)); }
    case 'BGE':  { const [s1,s2,lbl]=ops(3); return encB(0x63,0x5,reg(s1),reg(s2),parseImm(lbl,labels,pc)); }
    case 'BLTU': { const [s1,s2,lbl]=ops(3); return encB(0x63,0x6,reg(s1),reg(s2),parseImm(lbl,labels,pc)); }
    case 'BGEU': { const [s1,s2,lbl]=ops(3); return encB(0x63,0x7,reg(s1),reg(s2),parseImm(lbl,labels,pc)); }

    // ── U-type ────────────────────────────────────────────────────────────────
    case 'LUI':   { const [d,i]=ops(2); return encU(0x37,reg(d),(parseAbsImm(i,labels)>>>0)<<12); }
    case 'AUIPC': { const [d,i]=ops(2); return encU(0x17,reg(d),(parseAbsImm(i,labels)>>>0)<<12); }

    // ── J-type ────────────────────────────────────────────────────────────────
    case 'JAL': {
      const parts = ops2plus();
      if (parts.length === 1) {
        // JAL label  (rd defaults to ra)
        return encJ(0x6f,1,parseImm(parts[0],labels,pc));
      }
      const [d,lbl] = parts;
      return encJ(0x6f,reg(d),parseImm(lbl,labels,pc));
    }
    case 'JALR': {
      const parts = ops2plus();
      if (parts.length === 2) {
        // JALR rd, offset(rs1)
        const [d, mo] = parts;
        const [off, b] = parseMemOp(mo);
        return encI(0x67, 0x0, reg(d), b, off);
      }
      const [d,s,i] = parts;
      return encI(0x67,0x0,reg(d),reg(s),parseAbsImm(i,labels));
    }

    // ── System ────────────────────────────────────────────────────────────────
    case 'ECALL':  return 0x00000073;
    case 'EBREAK': return 0x00100073;
    case 'NOP':    return encI(0x13,0x0,0,0,0); // ADDI x0, x0, 0

    // ── Pseudo-instructions ───────────────────────────────────────────────────
    case 'MV':   { const [d,s]=ops(2); return encI(0x13,0x0,reg(d),reg(s),0); }        // MV  rd, rs  → ADDI rd, rs, 0
    case 'NOT':  { const [d,s]=ops(2); return encI(0x13,0x4,reg(d),reg(s),-1); }       // NOT rd, rs  → XORI rd, rs, -1
    case 'NEG':  { const [d,s]=ops(2); return encR(0x33,0x0,0x20,reg(d),0,reg(s)); }   // NEG rd, rs  → SUB  rd, x0, rs
    case 'RET':  return encI(0x67,0x0,0,1,0);                                          // RET         → JALR x0, ra, 0
    case 'J':    { const [lbl]=ops(1); return encJ(0x6f,0,parseImm(lbl,labels,pc)); }  // J  lbl      → JAL  x0, lbl
    case 'CALL': { const [lbl]=ops(1); return encJ(0x6f,1,parseImm(lbl,labels,pc)); }  // CALL lbl    → JAL  ra, lbl
    case 'LI': {
      const [d,i]=ops(2);
      const v = parseAbsImm(i,labels) | 0;
      return encI(0x13,0x0,reg(d),0,v);  // only works for 12-bit range; multi-word not supported
    }
    case 'SEQZ': { const [d,s]=ops(2); return encI(0x13,0x3,reg(d),reg(s),1); }    // SLTI rd, rs, 1 (unsigned)
    case 'SNEZ': { const [d,s]=ops(2); return encR(0x33,0x3,0x00,reg(d),0,reg(s)); } // SLTU rd, x0, rs

    default:
      throw new Error(`Unknown mnemonic: ${m}`);
  }
}

// Tokenize a line: strip comments, handle label:, return {label, mnemonic, args}
function tokenize(line) {
  // Strip ; and # comments
  line = line.replace(/[;#].*$/, '').trim();
  if (!line) return null;

  let label = null;
  const colonIdx = line.indexOf(':');
  if (colonIdx !== -1) {
    // Check this is actually a label (no spaces before colon)
    const candidate = line.slice(0, colonIdx).trim();
    if (/^\w+$/.test(candidate)) {
      label = candidate;
      line = line.slice(colonIdx + 1).trim();
    }
  }
  if (!line) return { label, mnemonic: null, args: '' };

  const spIdx = line.search(/\s/);
  let mnemonic, args;
  if (spIdx === -1) {
    mnemonic = line;
    args = '';
  } else {
    mnemonic = line.slice(0, spIdx);
    args = line.slice(spIdx + 1).trim();
  }
  return { label, mnemonic, args };
}

export function assemble(source, baseAddr = 0) {
  const lines = source.split('\n');
  const tokens = lines.map((l, i) => ({ ...tokenize(l), lineNo: i + 1, raw: l })).filter(Boolean);

  // Pass 1: collect labels
  const labels = new Map();
  let addr = baseAddr;
  for (const t of tokens) {
    if (t.label) labels.set(t.label, addr);
    if (t.mnemonic) addr += 4;
  }

  // Pass 2: encode
  const words = [];
  const errors = [];
  addr = baseAddr;
  for (const t of tokens) {
    if (!t.mnemonic) continue;
    try {
      const w = assembleInstr(t.mnemonic, t.args, labels, addr);
      words.push(w >>> 0);
    } catch (e) {
      errors.push(`Line ${t.lineNo}: ${e.message}  (${t.raw.trim()})`);
    }
    addr += 4;
  }

  return { words: new Uint32Array(words), errors, labels };
}
