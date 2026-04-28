#include "cpu.h"
#include "mem.h"
#include "regs.h"

void cpu_init(CPU *cpu) {
  regs_init(&cpu->regs);
  mem_init(&cpu->mem);
  cpu->pc = 0;
}

void cpu_free(CPU *cpu) {
  mem_free(&cpu->mem);
  cpu->pc = 0;
}