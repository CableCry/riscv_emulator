const REG_ALIASES = [
  'zero','ra','sp','gp','tp','t0','t1','t2',
  's0','s1','a0','a1','a2','a3','a4','a5',
  'a6','a7','s2','s3','s4','s5','s6','s7',
  's8','s9','s10','s11','t3','t4','t5','t6',
];

function reg(n) { return REG_ALIASES[n & 0x1f] ?? `x${n & 0x1f}`; }

function signExt(val, bits) {
  const shift = 32 - bits;
  return (val << shift) >> shift;
}

function immI(word) { return signExt(word >>> 20, 12); }
function immS(word) {
  const hi = (word >>> 25) & 0x7f;
  const lo = (word >>> 7) & 0x1f;
  return signExt((hi << 5) | lo, 12);
}
function immB(word) {
  const b12  = (word >>> 31) & 1;
  const b11  = (word >>> 7)  & 1;
  const b105 = (word >>> 25) & 0x3f;
  const b41  = (word >>> 8)  & 0xf;
  return signExt((b12 << 12) | (b11 << 11) | (b105 << 5) | (b41 << 1), 13);
}
function immU(word) { return word & 0xfffff000; }
function immJ(word) {
  const b20   = (word >>> 31) & 1;
  const b1910 = (word >>> 21) & 0x3ff;
  const b11   = (word >>> 20) & 1;
  const b1912 = (word >>> 12) & 0xff;
  return signExt((b20 << 20) | (b1912 << 12) | (b11 << 11) | (b1910 << 1), 21);
}

function fmtImm(n) { return n < 0 ? `-${(-n >>> 0).toString()}` : `${n}`; }

// Returns { opcode, operands, desc, fields, type, rd, rs1, rs2, imm } or null
export function disassemble(word, pc = 0) {
  const opcode  = word & 0x7f;
  const rd      = (word >>> 7)  & 0x1f;
  const funct3  = (word >>> 12) & 0x7;
  const rs1     = (word >>> 15) & 0x1f;
  const rs2     = (word >>> 20) & 0x1f;
  const funct7  = (word >>> 25) & 0x7f;

  switch (opcode) {
    case 0x33: { // R-type ALU
      const ops = {
        0b000: funct7 === 0x20 ? 'SUB'  : 'ADD',
        0b001: 'SLL',
        0b010: 'SLT',
        0b011: 'SLTU',
        0b100: 'XOR',
        0b101: funct7 === 0x20 ? 'SRA'  : 'SRL',
        0b110: 'OR',
        0b111: 'AND',
      };
      const op = ops[funct3] ?? '???';
      return {
        opcode: op, type: 'R',
        operands: `${reg(rd)}, ${reg(rs1)}, ${reg(rs2)}`,
        desc: `<strong>${reg(rd)}</strong> ← ${reg(rs1)} ${op.toLowerCase()} ${reg(rs2)}`,
        fields: { rd: reg(rd), rs1: reg(rs1), rs2: reg(rs2) },
        rd, rs1, rs2, imm: null,
      };
    }
    case 0x13: { // I-type ALU
      const imm = immI(word);
      const shamt = rs2; // same bits as rs2 for shifts
      const ops = {
        0b000: 'ADDI',
        0b010: 'SLTI',
        0b011: 'SLTIU',
        0b100: 'XORI',
        0b110: 'ORI',
        0b111: 'ANDI',
        0b001: 'SLLI',
        0b101: funct7 === 0x20 ? 'SRAI' : 'SRLI',
      };
      const op = ops[funct3] ?? '???';
      const isShift = op === 'SLLI' || op === 'SRLI' || op === 'SRAI';
      const immStr = isShift ? `${shamt}` : fmtImm(imm);
      return {
        opcode: op, type: 'I',
        operands: `${reg(rd)}, ${reg(rs1)}, ${immStr}`,
        desc: `<strong>${reg(rd)}</strong> ← ${reg(rs1)} ${op.toLowerCase().replace('i','')} ${immStr}`,
        fields: { rd: reg(rd), rs1: reg(rs1), imm: `0x${(imm >>> 0).toString(16).toUpperCase().padStart(3,'0')}` },
        rd, rs1, rs2: -1, imm: isShift ? shamt : imm,
      };
    }
    case 0x03: { // LOAD
      const imm = immI(word);
      const ops = { 0b000:'LB', 0b001:'LH', 0b010:'LW', 0b100:'LBU', 0b101:'LHU' };
      const op = ops[funct3] ?? '???';
      return {
        opcode: op, type: 'I',
        operands: `${reg(rd)}, ${fmtImm(imm)}(${reg(rs1)})`,
        desc: `<strong>${reg(rd)}</strong> ← mem[${reg(rs1)} + ${fmtImm(imm)}]`,
        fields: { rd: reg(rd), rs1: reg(rs1), offset: fmtImm(imm) },
        rd, rs1, rs2: -1, imm,
      };
    }
    case 0x23: { // STORE
      const imm = immS(word);
      const ops = { 0b000:'SB', 0b001:'SH', 0b010:'SW' };
      const op = ops[funct3] ?? '???';
      return {
        opcode: op, type: 'S',
        operands: `${reg(rs2)}, ${fmtImm(imm)}(${reg(rs1)})`,
        desc: `mem[${reg(rs1)} + ${fmtImm(imm)}] ← <strong>${reg(rs2)}</strong>`,
        fields: { rs1: reg(rs1), rs2: reg(rs2), offset: fmtImm(imm) },
        rd: -1, rs1, rs2, imm,
      };
    }
    case 0x63: { // BRANCH
      const imm = immB(word);
      const target = pc + imm;
      const ops = {
        0b000:'BEQ', 0b001:'BNE',
        0b100:'BLT', 0b101:'BGE',
        0b110:'BLTU', 0b111:'BGEU',
      };
      const op = ops[funct3] ?? '???';
      return {
        opcode: op, type: 'B',
        operands: `${reg(rs1)}, ${reg(rs2)}, ${fmtImm(imm)}`,
        desc: `if ${reg(rs1)} ${op.slice(1).toLowerCase()} ${reg(rs2)} → PC = 0x${(target >>> 0).toString(16).padStart(8,'0')}`,
        fields: { rs1: reg(rs1), rs2: reg(rs2), offset: fmtImm(imm) },
        rd: -1, rs1, rs2, imm,
      };
    }
    case 0x6f: { // JAL
      const imm = immJ(word);
      return {
        opcode: 'JAL', type: 'J',
        operands: `${reg(rd)}, ${fmtImm(imm)}`,
        desc: `<strong>${reg(rd)}</strong> ← PC+4; jump to PC + ${fmtImm(imm)}`,
        fields: { rd: reg(rd), offset: fmtImm(imm) },
        rd, rs1: -1, rs2: -1, imm,
      };
    }
    case 0x67: { // JALR
      const imm = immI(word);
      return {
        opcode: 'JALR', type: 'I',
        operands: `${reg(rd)}, ${reg(rs1)}, ${fmtImm(imm)}`,
        desc: `<strong>${reg(rd)}</strong> ← PC+4; jump to ${reg(rs1)} + ${fmtImm(imm)}`,
        fields: { rd: reg(rd), rs1: reg(rs1), offset: fmtImm(imm) },
        rd, rs1, rs2: -1, imm,
      };
    }
    case 0x37: { // LUI
      const imm = immU(word);
      return {
        opcode: 'LUI', type: 'U',
        operands: `${reg(rd)}, 0x${(imm >>> 12).toString(16).toUpperCase()}`,
        desc: `<strong>${reg(rd)}</strong> ← 0x${(imm >>> 0).toString(16).padStart(8,'0')}`,
        fields: { rd: reg(rd), imm: `0x${(imm >>> 12).toString(16).toUpperCase()}` },
        rd, rs1: -1, rs2: -1, imm,
      };
    }
    case 0x17: { // AUIPC
      const imm = immU(word);
      return {
        opcode: 'AUIPC', type: 'U',
        operands: `${reg(rd)}, 0x${(imm >>> 12).toString(16).toUpperCase()}`,
        desc: `<strong>${reg(rd)}</strong> ← PC + 0x${(imm >>> 0).toString(16).padStart(8,'0')}`,
        fields: { rd: reg(rd), imm: `0x${(imm >>> 12).toString(16).toUpperCase()}` },
        rd, rs1: -1, rs2: -1, imm,
      };
    }
    case 0x73: { // SYSTEM
      if (word === 0x00000073) return { opcode: 'ECALL',  type: 'E', operands: '', desc: 'Environment call — transfer control to OS/runtime', fields: {}, rd: -1, rs1: -1, rs2: -1, imm: null };
      if (word === 0x00100073) return { opcode: 'EBREAK', type: 'E', operands: '', desc: 'Breakpoint — halt execution for debugger', fields: {}, rd: -1, rs1: -1, rs2: -1, imm: null };
      return null;
    }
    default:
      return null;
  }
}
