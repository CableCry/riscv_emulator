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

// manual.operands: [ { label, name, desc } ]
// Shown in the instruction help popup.

// Returns { opcode, operands, desc, fields, type, rd, rs1, rs2, imm, manual } or null
export function disassemble(word, pc = 0) {
  const opcode  = word & 0x7f;
  const rd      = (word >>> 7)  & 0x1f;
  const funct3  = (word >>> 12) & 0x7;
  const rs1     = (word >>> 15) & 0x1f;
  const rs2     = (word >>> 20) & 0x1f;
  const funct7  = (word >>> 25) & 0x7f;

  switch (opcode) {
    case 0x33: { // R-type ALU (RV32I) or RV32M multiply/divide (funct7=0x01)
      if (funct7 === 0x01) {
        // RV32M
        const mOps = {
          0b000: ['MUL',    'multiplies (lower 32 bits of signed×signed)'],
          0b001: ['MULH',   'multiplies (upper 32 bits of signed×signed)'],
          0b010: ['MULHSU', 'multiplies (upper 32 bits of signed×unsigned)'],
          0b011: ['MULHU',  'multiplies (upper 32 bits of unsigned×unsigned)'],
          0b100: ['DIV',    'divides (signed)'],
          0b101: ['DIVU',   'divides (unsigned)'],
          0b110: ['REM',    'computes remainder (signed)'],
          0b111: ['REMU',   'computes remainder (unsigned)'],
        };
        const [op, verbPhrase] = mOps[funct3] ?? ['???', 'operates on'];
        return {
          opcode: op, type: 'R',
          operands: `${reg(rd)}, ${reg(rs1)}, ${reg(rs2)}`,
          desc: `<strong>${reg(rd)}</strong> ← ${reg(rs1)} ${op.toLowerCase()} ${reg(rs2)}`,
          fields: { rd: reg(rd), rs1: reg(rs1), rs2: reg(rs2) },
          rd, rs1, rs2, imm: null,
          manual: {
            synopsis: `${op} (RV32M): ${verbPhrase} ${reg(rs1)} by ${reg(rs2)}, writes result to ${reg(rd)}.`,
            operands: [
              { label: 'rd',  name: reg(rd),  desc: 'Destination register — result is written here' },
              { label: 'rs1', name: reg(rs1), desc: 'Dividend / left operand' },
              { label: 'rs2', name: reg(rs2), desc: 'Divisor / right operand' },
            ],
          },
        };
      }
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
      const opVerbs = {
        ADD:'adds', SUB:'subtracts', SLL:'shifts left', SRL:'shifts right logically',
        SRA:'shifts right arithmetically', AND:'bitwise-ANDs', OR:'bitwise-ORs',
        XOR:'bitwise-XORs', SLT:'compares (signed)', SLTU:'compares (unsigned)',
      };
      const verb = opVerbs[op] ?? 'operates on';
      return {
        opcode: op, type: 'R',
        operands: `${reg(rd)}, ${reg(rs1)}, ${reg(rs2)}`,
        desc: `<strong>${reg(rd)}</strong> ← ${reg(rs1)} ${op.toLowerCase()} ${reg(rs2)}`,
        fields: { rd: reg(rd), rs1: reg(rs1), rs2: reg(rs2) },
        rd, rs1, rs2, imm: null,
        manual: {
          synopsis: `${op}: ${verb} ${reg(rs1)} and ${reg(rs2)}, writes result to ${reg(rd)}.`,
          operands: [
            { label: 'rd',  name: reg(rd),  desc: 'Destination register — result is written here' },
            { label: 'rs1', name: reg(rs1), desc: 'First source register (left operand)' },
            { label: 'rs2', name: reg(rs2), desc: 'Second source register (right operand)' },
          ],
        },
      };
    }
    case 0x13: { // I-type ALU
      const imm = immI(word);
      const shamt = rs2;
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
      const synopses = {
        ADDI:'adds a 12-bit signed immediate to', SLTI:'sets rd=1 if (signed)', SLTIU:'sets rd=1 if (unsigned)',
        XORI:'XORs a 12-bit immediate with', ORI:'ORs a 12-bit immediate with',
        ANDI:'ANDs a 12-bit immediate with', SLLI:'shifts left by', SRLI:'shifts right logically by', SRAI:'shifts right arithmetically by',
      };
      return {
        opcode: op, type: 'I',
        operands: `${reg(rd)}, ${reg(rs1)}, ${immStr}`,
        desc: `<strong>${reg(rd)}</strong> ← ${reg(rs1)} ${op.toLowerCase().replace('i','')} ${immStr}`,
        fields: { rd: reg(rd), rs1: reg(rs1), imm: `0x${(imm >>> 0).toString(16).toUpperCase().padStart(3,'0')}` },
        rd, rs1, rs2: -1, imm: isShift ? shamt : imm,
        manual: {
          synopsis: `${op}: ${synopses[op] ?? 'operates on'} ${reg(rs1)}${ isShift ? ` by ${shamt} bits` : `, stores result in ${reg(rd)}`}.`,
          operands: [
            { label: 'rd',  name: reg(rd),  desc: 'Destination register — result is written here' },
            { label: 'rs1', name: reg(rs1), desc: 'Source register' },
            isShift
              ? { label: 'shamt', name: String(shamt), desc: 'Shift amount (0–31 bits)' }
              : { label: 'imm',   name: immStr,         desc: '12-bit signed immediate, sign-extended to 32 bits' },
          ],
        },
      };
    }
    case 0x03: { // LOAD
      const imm = immI(word);
      const ops = { 0b000:'LB', 0b001:'LH', 0b010:'LW', 0b100:'LBU', 0b101:'LHU' };
      const sizes = { LB:'1 byte (sign-ext)', LH:'2 bytes (sign-ext)', LW:'4 bytes', LBU:'1 byte (zero-ext)', LHU:'2 bytes (zero-ext)' };
      const op = ops[funct3] ?? '???';
      return {
        opcode: op, type: 'I',
        operands: `${reg(rd)}, ${fmtImm(imm)}(${reg(rs1)})`,
        desc: `<strong>${reg(rd)}</strong> ← mem[${reg(rs1)} + ${fmtImm(imm)}]`,
        fields: { rd: reg(rd), rs1: reg(rs1), offset: fmtImm(imm) },
        rd, rs1, rs2: -1, imm,
        manual: {
          synopsis: `${op}: loads ${sizes[op] ?? '?'} from address (${reg(rs1)} + ${fmtImm(imm)}) into ${reg(rd)}.`,
          operands: [
            { label: 'rd',     name: reg(rd),    desc: 'Destination register — loaded value written here' },
            { label: 'rs1',    name: reg(rs1),   desc: 'Base address register' },
            { label: 'offset', name: fmtImm(imm), desc: 'Signed byte offset added to the base address' },
          ],
        },
      };
    }
    case 0x23: { // STORE
      const imm = immS(word);
      const ops = { 0b000:'SB', 0b001:'SH', 0b010:'SW' };
      const sizes = { SB:'1 byte (low 8 bits)', SH:'2 bytes (low 16 bits)', SW:'4 bytes (full word)' };
      const op = ops[funct3] ?? '???';
      return {
        opcode: op, type: 'S',
        operands: `${reg(rs2)}, ${fmtImm(imm)}(${reg(rs1)})`,
        desc: `mem[${reg(rs1)} + ${fmtImm(imm)}] ← <strong>${reg(rs2)}</strong>`,
        fields: { rs1: reg(rs1), rs2: reg(rs2), offset: fmtImm(imm) },
        rd: -1, rs1, rs2, imm,
        manual: {
          synopsis: `${op}: stores ${sizes[op] ?? '?'} of ${reg(rs2)} to address (${reg(rs1)} + ${fmtImm(imm)}).`,
          operands: [
            { label: 'rs2',    name: reg(rs2),   desc: 'Source register — value to store' },
            { label: 'rs1',    name: reg(rs1),   desc: 'Base address register' },
            { label: 'offset', name: fmtImm(imm), desc: 'Signed byte offset added to the base address' },
          ],
        },
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
      const conds = {
        BEQ:'if rs1 == rs2', BNE:'if rs1 ≠ rs2',
        BLT:'if rs1 < rs2 (signed)', BGE:'if rs1 ≥ rs2 (signed)',
        BLTU:'if rs1 < rs2 (unsigned)', BGEU:'if rs1 ≥ rs2 (unsigned)',
      };
      const op = ops[funct3] ?? '???';
      return {
        opcode: op, type: 'B',
        operands: `${reg(rs1)}, ${reg(rs2)}, ${fmtImm(imm)}`,
        desc: `if ${reg(rs1)} ${op.slice(1).toLowerCase()} ${reg(rs2)} → PC = 0x${(target >>> 0).toString(16).padStart(8,'0')}`,
        fields: { rs1: reg(rs1), rs2: reg(rs2), offset: fmtImm(imm) },
        rd: -1, rs1, rs2, imm,
        manual: {
          synopsis: `${op}: ${conds[op] ?? 'branch'}, jump to PC + ${fmtImm(imm)} (→ 0x${(target >>> 0).toString(16).padStart(8,'0')}).`,
          operands: [
            { label: 'rs1',    name: reg(rs1),   desc: 'First comparison register' },
            { label: 'rs2',    name: reg(rs2),   desc: 'Second comparison register' },
            { label: 'offset', name: fmtImm(imm), desc: 'PC-relative branch offset in bytes (must be 2-byte aligned)' },
          ],
        },
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
        manual: {
          synopsis: `JAL: saves return address (PC+4) into ${reg(rd)}, then jumps unconditionally to PC + ${fmtImm(imm)}.`,
          operands: [
            { label: 'rd',     name: reg(rd),    desc: 'Return-address register — PC+4 is written here before jumping' },
            { label: 'offset', name: fmtImm(imm), desc: 'PC-relative jump offset in bytes (must be 2-byte aligned)' },
          ],
        },
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
        manual: {
          synopsis: `JALR: saves return address (PC+4) into ${reg(rd)}, then jumps to (${reg(rs1)} + ${fmtImm(imm)}) with bit 0 cleared.`,
          operands: [
            { label: 'rd',     name: reg(rd),    desc: 'Return-address register — PC+4 is written here before jumping' },
            { label: 'rs1',    name: reg(rs1),   desc: 'Base register for the jump target' },
            { label: 'offset', name: fmtImm(imm), desc: 'Signed offset added to rs1 to form the jump address' },
          ],
        },
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
        manual: {
          synopsis: `LUI: loads a 20-bit constant into the upper bits of ${reg(rd)}, zeroing the lower 12 bits.`,
          operands: [
            { label: 'rd',  name: reg(rd),                                      desc: 'Destination register — result written here' },
            { label: 'imm', name: `0x${(imm >>> 12).toString(16).toUpperCase()}`, desc: '20-bit immediate placed in bits 31–12; lower 12 bits are set to zero' },
          ],
        },
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
        manual: {
          synopsis: `AUIPC: adds a 20-bit upper immediate to the current PC and writes the result to ${reg(rd)}.`,
          operands: [
            { label: 'rd',  name: reg(rd),                                      desc: 'Destination register — result written here' },
            { label: 'imm', name: `0x${(imm >>> 12).toString(16).toUpperCase()}`, desc: '20-bit immediate (in bits 31–12) added to the current PC' },
          ],
        },
      };
    }
    case 0x73: { // SYSTEM
      if (word === 0x00000073) return {
        opcode: 'ECALL', type: 'E', operands: '',
        desc: 'Environment call — transfer control to OS/runtime',
        fields: {}, rd: -1, rs1: -1, rs2: -1, imm: null,
        manual: {
          synopsis: 'ECALL: transfers control to the execution environment (OS or runtime). The return value is passed back in a0.',
          operands: [
            { label: 'a0', name: 'a0', desc: 'Return value register — holds the result when main() exits' },
            { label: 'a7', name: 'a7', desc: 'System-call number register (convention; not used by this emulator)' },
          ],
        },
      };
      if (word === 0x00100073) return {
        opcode: 'EBREAK', type: 'E', operands: '',
        desc: 'Breakpoint — halt execution for debugger',
        fields: {}, rd: -1, rs1: -1, rs2: -1, imm: null,
        manual: {
          synopsis: 'EBREAK: raises a breakpoint exception, transferring control to the attached debugger.',
          operands: [],
        },
      };
      return null;
    }
    default:
      return null;
  }
}
