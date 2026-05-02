#ifndef CPU_H
#define CPU_H

#include "mem.h"
#include "regs.h"
#include <stdint.h>

typedef enum {
  TRAP_NONE = 0,
  TRAP_ILLEGAL_INSTR = 1,
  TRAP_LOAD_FAULT = 2,
  TRAP_STORE_FAULT = 3,
  TRAP_MISALIGNED_FETCH = 4,
  TRAP_ECALL = 5,
  TRAP_EBREAK = 6,
} TrapCause;

typedef struct {
  Registers regs;
  uint32_t pc;
  Memory mem;
  TrapCause trap;
  uint32_t trap_val;
} CPU;

void cpu_init(CPU *cpu);
void cpu_free(CPU *cpu);
uint32_t fetch(CPU *cpu);
void cpu_step(CPU *cpu);

#ifdef CPU_TEST
void test_cpu();
void test_traps();
#endif

#endif
