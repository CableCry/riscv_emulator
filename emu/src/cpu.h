#ifndef CPU_H
#define CPU_H

#include "mem.h"
#include "regs.h"

typedef struct {
  Registers regs;
  uint32_t pc;
  Memory mem;
} CPU;

void cpu_init(CPU *cpu);
void cpu_free(CPU *cpu);


#ifdef CPU_TEST
void test_cpu();
#endif


#endif