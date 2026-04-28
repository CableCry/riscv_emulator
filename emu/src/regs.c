#include "regs.h"
#include <stdint.h>
#include <string.h>

void regs_init(Registers *r) { memset(r->regs, 0, sizeof(r->regs)); }

void write_reg(Registers *r, uint32_t reg, uint32_t val) {
  if (reg == 0 || (reg >= NUM_OF_REGS || reg < 0)) {
    return;
  }
  r->regs[reg] = val;
}

uint32_t read_reg(Registers *r, uint32_t reg) {
  if (reg >= NUM_OF_REGS) {
    return 0;
  }
  return r->regs[reg];
}
