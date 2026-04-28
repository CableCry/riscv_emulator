#include "decode.h"
#include <stdint.h>

DecodedInstr decode(uint32_t instr) {
  DecodedInstr d = {0};
  d.opcode = instr & 0x7F;
  d.rd = (instr >> 7) & 0x1F;
  d.funct3 = (instr >> 12) & 0x07;
  d.rs1 = (instr >> 15) & 0x1F;
  d.rs2 = (instr >> 20) & 0x1F;
  d.funct7 = (instr >> 25) & 0x7F;

  switch (d.opcode) {
  case 0x33: // R-type: no immediate
    break;
  case 0x13:
  case 0x03:
  case 0x67: // I-type
    d.imm = (int32_t)instr >> 20;
    break;
  case 0x23: // S-type
    d.imm = ((int32_t)(instr & 0xFE000000) >> 20) | ((instr >> 7) & 0x1F);
    break;
  case 0x63: // B-type
    d.imm = ((int32_t)(instr & 0x80000000) >> 19) |
            ((instr & 0x7E000000) >> 20) | ((instr & 0x00000F00) >> 7) |
            ((instr & 0x00000080) << 4);
    break;
    break;
  case 0x37:
  case 0x17: // U-type
    d.imm = (int32_t)(instr & 0xFFFFF000);
    break;
  case 0x6F: // J-type
    d.imm = ((int32_t)(instr & 0x80000000) >> 11) | (instr & 0xFF000) |
            ((instr >> 9) & 0x800) | ((instr >> 20) & 0x7FE);
    break;
  default:
    d.opcode = 0xFF;
    break;
  }
  return d;
}