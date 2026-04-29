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
                  read_reg(&cpu->regs, d->rs1) + read_reg(&cpu->regs, d->rs2));
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

  case 0x13: // I-type ALU
    break;

  case 0x03: // Loads
    break;

  case 0x23: // Stores
    break;

  case 0x63: // Branches
    break;

  case 0x37: // LUI
    break;

  case 0x17: // AUIPC
    break;

  case 0x6F: // JAL
    break;

  case 0x67: // JALR
    break;

  default:
    printf("Unknown opcode: 0x%02X at pc=0x%08X\n", d->opcode, cpu->pc);
    break;
  }
}