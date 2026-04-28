#ifndef DECODE_H
#define DECODE_H

#include <stdint.h>


typedef struct {
  uint8_t opcode;
  uint8_t rd;
  uint8_t funct3;
  uint8_t rs1;
  uint8_t rs2;
  uint8_t funct7;
  int32_t imm;
} DecodedInstr;

DecodedInstr decode(uint32_t instr);


#ifdef DECODE_TEST
void test_decode();
bool decoded_is_equal(DecodedInstr *a, DecodedInstr *b);
#endif

#endif