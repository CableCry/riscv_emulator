#include <assert.h>
#include <stdbool.h>
#include <stdio.h>

#define MEM_TEST
#include "mem.h"

void test_memory() {
  Memory m;
  mem_init(&m);

  mem_write32(&m, 0x00, 0xDEADBEEF);
  assert(mem_read32(&m, 0x00) == 0xDEADBEEF);
  assert(mem_read8(&m, 0x00) == 0xEF);
  assert(mem_read8(&m, 0x01) == 0xBE);
  assert(mem_read16(&m, 0x00) == 0xBEEF);

  mem_free(&m);
  printf("Memory tests passed\n");
}

#define REG_TEST
#include "regs.h"
void test_registers() {
  Registers r;
  regs_init(&r);

  write_reg(&r, 0, 69); // should be ignored
  assert(read_reg(&r, 0) == 0);

  write_reg(&r, 1, 69);
  assert(read_reg(&r, 1) == 69);

  write_reg(&r, 2, 420);
  assert(read_reg(&r, 2) == 420);

  write_reg(&r, 3, 360);
  assert(read_reg(&r, 3) == 360);

  write_reg(&r, 4, 1024);
  assert(read_reg(&r, 4) == 1024);

  write_reg(&r, 5, 21);
  assert(read_reg(&r, 5) == 21);

  write_reg(&r, 6, 42);
  assert(read_reg(&r, 6) == 42);

  write_reg(&r, 7, 88);
  assert(read_reg(&r, 7) == 88);

  write_reg(&r, 31, 9);
  assert(read_reg(&r, 31) == 9);

  printf("Register tests passed\n");
}

#define DECODE_TEST
#include "decode.h"
bool decoded_is_equal(DecodedInstr *a, DecodedInstr *b) {
  if (a->opcode != b->opcode)
    return false;
  if (a->imm != b->imm)
    return false;

  if (a->opcode != 0x23 && a->opcode != 0x63) {
    if (a->rd != b->rd)
      return false;
  }

  if (a->opcode != 0x37 && a->opcode != 0x17 && a->opcode != 0x6F) {
    if (a->funct3 != b->funct3)
      return false;
    if (a->rs1 != b->rs1)
      return false;
  }

  if (a->opcode == 0x33) {
    if (a->rs2 != b->rs2)
      return false;
    if (a->funct7 != b->funct7)
      return false;
  }

  return true;
}

void test_decode() {

  // R-type: ADD x0, x1, x2
  const uint32_t ADD = 0x00208033;
  DecodedInstr ADD_EXPECTED = {.opcode = 0x33,
                               .rd = 0,
                               .funct3 = 0x0,
                               .rs1 = 1,
                               .rs2 = 2,
                               .funct7 = 0x00,
                               .imm = 0};
  DecodedInstr add_result = decode(ADD);
  assert(decoded_is_equal(&ADD_EXPECTED, &add_result));

  // I-type: ADDI x1, x0, 5
  const uint32_t ADDI = 0x00500093;
  DecodedInstr ADDI_EXPECTED = {.opcode = 0x13,
                                .rd = 1,
                                .funct3 = 0x0,
                                .rs1 = 0,
                                .rs2 = 0,
                                .funct7 = 0,
                                .imm = 5};
  DecodedInstr addi_result = decode(ADDI);
  assert(decoded_is_equal(&ADDI_EXPECTED, &addi_result));

  // S-type: SW x1, 0(x2)
  const uint32_t SW = 0x00112023;
  DecodedInstr SW_EXPECTED = {.opcode = 0x23,
                              .rd = 0,
                              .funct3 = 0x2,
                              .rs1 = 2,
                              .rs2 = 1,
                              .funct7 = 0,
                              .imm = 0};
  DecodedInstr sw_result = decode(SW);
  assert(decoded_is_equal(&SW_EXPECTED, &sw_result));

  // B-type: BEQ x1, x2, +8
  const uint32_t BEQ = 0x00208463;
  DecodedInstr BEQ_EXPECTED = {.opcode = 0x63,
                               .rd = 0,
                               .funct3 = 0x0,
                               .rs1 = 1,
                               .rs2 = 2,
                               .funct7 = 0,
                               .imm = 8};
  DecodedInstr beq_result = decode(BEQ);
  assert(decoded_is_equal(&BEQ_EXPECTED, &beq_result));

  // U-type: LUI x1, 0x12
  const uint32_t LUI = 0x000120B7;
  DecodedInstr LUI_EXPECTED = {.opcode = 0x37,
                               .rd = 1,
                               .funct3 = 0,
                               .rs1 = 0,
                               .rs2 = 0,
                               .funct7 = 0,
                               .imm = 0x12000};
  DecodedInstr lui_result = decode(LUI);
  assert(decoded_is_equal(&LUI_EXPECTED, &lui_result));

  // J-type: JAL x1, +8
  const uint32_t JAL = 0x008000EF;
  DecodedInstr JAL_EXPECTED = {.opcode = 0x6F,
                               .rd = 1,
                               .funct3 = 0,
                               .rs1 = 0,
                               .rs2 = 0,
                               .funct7 = 0,
                               .imm = 8};
  DecodedInstr jal_result = decode(JAL);
  assert(decoded_is_equal(&JAL_EXPECTED, &jal_result));

  printf("Decode tests passed\n");
}

int main() {
  test_memory();
  test_registers();
  test_decode();
  return 0;
}
