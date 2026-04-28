#ifndef REGISTER_H
#define REGISTER_H

#include <stdint.h>
#define NUM_OF_REGS 32

typedef struct {
  uint32_t regs[32];
} Registers;

void regs_init(Registers *r);
void write_reg(Registers *r, uint32_t reg, uint32_t val);
uint32_t read_reg(Registers *r, uint32_t reg);

#ifdef REG_TEST
void test_registers();
#endif

#endif