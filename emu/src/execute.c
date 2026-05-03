#include "execute.h"
#include "regs.h"
#include <stdint.h>
#include <stdio.h>

void execute(CPU *cpu, DecodedInstr *d) {
  switch (d->opcode) {

  case 0x33: // R-type
    switch (d->funct3) {

    case 0x0: // ADD / SUB
      // ADD
      if (d->funct7 == 0x00) {
        write_reg(&cpu->regs, d->rd,
                  read_reg(&cpu->regs, d->rs1) + read_reg(&cpu->regs, d->rs2));
      }
      // SUB
      else if (d->funct7 == 0x20) {
        write_reg(&cpu->regs, d->rd,
                  read_reg(&cpu->regs, d->rs1) - read_reg(&cpu->regs, d->rs2));
      }
      break;

    case 0x1: // SLL
      write_reg(&cpu->regs, d->rd,
                read_reg(&cpu->regs, d->rs1)
                    << (read_reg(&cpu->regs, d->rs2) & 0x1F));
      break;

    case 0x2: // SLT
      write_reg(&cpu->regs, d->rd,
                ((int32_t)read_reg(&cpu->regs, d->rs1) <
                         (int32_t)read_reg(&cpu->regs, d->rs2)
                     ? 1
                     : 0));
      break;

    case 0x3: // STLU
      write_reg(&cpu->regs, d->rd,
                (read_reg(&cpu->regs, d->rs1) < read_reg(&cpu->regs, d->rs2))
                    ? 1
                    : 0);
      break;

    case 0x4: // XOR
      write_reg(&cpu->regs, d->rd,
                read_reg(&cpu->regs, d->rs1) ^ read_reg(&cpu->regs, d->rs2));
      break;

    case 0x5:                  // SRL / SRA
      if (d->funct7 == 0x00) { // SRL
        write_reg(&cpu->regs, d->rd,
                  read_reg(&cpu->regs, d->rs1) >>
                      (read_reg(&cpu->regs, d->rs2) & 0x1F));
      } else if (d->funct7 == 0x20) { // SRA
        write_reg(&cpu->regs, d->rd,
                  (int32_t)read_reg(&cpu->regs, d->rs1) >>
                      (read_reg(&cpu->regs, d->rs2) & 0x1F));
      }

      break;

    case 0x6: // OR
      write_reg(&cpu->regs, d->rd,
                read_reg(&cpu->regs, d->rs1) | read_reg(&cpu->regs, d->rs2));
      break;

    case 0x7: // AND
      write_reg(&cpu->regs, d->rd,
                read_reg(&cpu->regs, d->rs1) & read_reg(&cpu->regs, d->rs2));
      break;
    }
    break;

  case 0x13: // I-type ALU — opcode 0x13
    switch (d->funct3) {

    case 0x0: // ADDI — rd = rs1 + imm
      write_reg(&cpu->regs, d->rd, read_reg(&cpu->regs, d->rs1) + d->imm);
      break;

    case 0x1: // SLLI — rd = rs1 << imm[4:0]
      write_reg(&cpu->regs, d->rd,
                read_reg(&cpu->regs, d->rs1) << (d->imm & 0x1F));
      break;

    case 0x2: // SLTI — rd = (rs1 < imm) signed ? 1 : 0
      write_reg(&cpu->regs, d->rd,
                (int32_t)read_reg(&cpu->regs, d->rs1) < (int32_t)d->imm ? 1
                                                                        : 0);
      break;

    case 0x3: // SLTIU — rd = (rs1 < imm) unsigned ? 1 : 0
      write_reg(&cpu->regs, d->rd,
                read_reg(&cpu->regs, d->rs1) < (uint32_t)d->imm ? 1 : 0);
      break;

    case 0x4: // XORI — rd = rs1 ^ imm
      write_reg(&cpu->regs, d->rd, read_reg(&cpu->regs, d->rs1) ^ d->imm);
      break;

    case 0x5: // SRLI / SRAI — distinguished by imm bit 10
      if ((d->imm & 0x400) == 0)
        // SRLI — rd = rs1 >> imm[4:0], zero fill
        write_reg(&cpu->regs, d->rd,
                  read_reg(&cpu->regs, d->rs1) >> (d->imm & 0x1F));
      else
        // SRAI — rd = rs1 >> imm[4:0], sign fill
        write_reg(&cpu->regs, d->rd,
                  (int32_t)read_reg(&cpu->regs, d->rs1) >> (d->imm & 0x1F));
      break;

    case 0x6: // ORI — rd = rs1 | imm
      write_reg(&cpu->regs, d->rd, read_reg(&cpu->regs, d->rs1) | d->imm);
      break;

    case 0x7: // ANDI — rd = rs1 & imm
      write_reg(&cpu->regs, d->rd, read_reg(&cpu->regs, d->rs1) & d->imm);
      break;
    }
    break;

  case 0x03: // Loads
    switch (d->funct3) {
    case 0x0: // LB - load byte, sign extended
      write_reg(&cpu->regs, d->rd,
                (int32_t)(int8_t)mem_read8(
                    cpu, read_reg(&cpu->regs, d->rs1) + d->imm));
      break;
    case 0x1: // LH - load halfword, sign extended
      write_reg(&cpu->regs, d->rd,
                (int32_t)(int16_t)mem_read16(
                    cpu, read_reg(&cpu->regs, d->rs1) + d->imm));
      break;
    case 0x2: // LW - load word
      write_reg(&cpu->regs, d->rd,
                mem_read32(cpu, read_reg(&cpu->regs, d->rs1) + d->imm));
      break;
    case 0x4: // LBU - load byte, zero extended
      write_reg(&cpu->regs, d->rd,
                (uint32_t)mem_read8(cpu,
                                    read_reg(&cpu->regs, d->rs1) + d->imm));
      break;
    case 0x5: // LHU - load halfword, zero extended
      write_reg(&cpu->regs, d->rd,
                (uint32_t)mem_read16(cpu,
                                     read_reg(&cpu->regs, d->rs1) + d->imm));
      break;
    }

    break;

  case 0x23: // Stores
    switch (d->funct3) {
    case 0x0: // SB - store byte
      mem_write8(cpu, read_reg(&cpu->regs, d->rs1) + d->imm,
                 (uint8_t)read_reg(&cpu->regs, d->rs2));
      break;
    case 0x1: // SH - store halfword
      mem_write16(cpu, read_reg(&cpu->regs, d->rs1) + d->imm,
                  (uint16_t)read_reg(&cpu->regs, d->rs2));
      break;
    case 0x2: // SW - store word
      mem_write32(cpu, read_reg(&cpu->regs, d->rs1) + d->imm,
                  read_reg(&cpu->regs, d->rs2));
      break;
    }
    break;

  case 0x63: // Branches
    switch (d->funct3) {
    case 0x0: // BEQ - branch if equal
      if (read_reg(&cpu->regs, d->rs1) == read_reg(&cpu->regs, d->rs2))
        cpu->pc += d->imm - 4;
      break;
    case 0x1: // BNE - branch if not equal
      if (read_reg(&cpu->regs, d->rs1) != read_reg(&cpu->regs, d->rs2))
        cpu->pc += d->imm - 4;
      break;
    case 0x4: // BLT - branch if less than (signed)
      if ((int32_t)read_reg(&cpu->regs, d->rs1) <
          (int32_t)read_reg(&cpu->regs, d->rs2))
        cpu->pc += d->imm - 4;
      break;
    case 0x5: // BGE - branch if greater or equal (signed)
      if ((int32_t)read_reg(&cpu->regs, d->rs1) >=
          (int32_t)read_reg(&cpu->regs, d->rs2))
        cpu->pc += d->imm - 4;
      break;
    case 0x6: // BLTU - branch if less than (unsigned)
      if (read_reg(&cpu->regs, d->rs1) < read_reg(&cpu->regs, d->rs2))
        cpu->pc += d->imm - 4;
      break;
    case 0x7: // BGEU - branch if greater or equal (unsigned)
      if (read_reg(&cpu->regs, d->rs1) >= read_reg(&cpu->regs, d->rs2))
        cpu->pc += d->imm - 4;
      break;
    }
    break;

  case 0x37: // LUI - load upper immediate
    write_reg(&cpu->regs, d->rd, d->imm);
    break;

  case 0x17: // AUIPC - add upper immediate to pc
    write_reg(&cpu->regs, d->rd, cpu->pc - 4 + d->imm);
    break;

  case 0x6F: // JAL - jump and link
    write_reg(&cpu->regs, d->rd, cpu->pc);
    cpu->pc += d->imm - 4;
    break;

  case 0x67: // JALR - jump and link register
    write_reg(&cpu->regs, d->rd, cpu->pc);
    cpu->pc = (read_reg(&cpu->regs, d->rs1) + d->imm) & ~1;
    break;

  case 0x73: // SYSTEM
    switch (d->funct3) {
    case 0x0:
      if (d->imm == 0x0) // ECALL
        cpu->trap = TRAP_ECALL;
      else if (d->imm == 0x1) // EBREAK
        cpu->trap = TRAP_EBREAK;
      break;
    }
    break;

  default:
    cpu->trap = TRAP_ILLEGAL_INSTR;
    cpu->trap_val = cpu->pc - 4;
    break;
  }
}
