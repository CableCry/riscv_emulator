#include "cpu.h"
#include "decode.h"
#include "execute.h"
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

uint32_t fetch(CPU *cpu) {
  uint32_t instr = mem_read32(&cpu->mem, cpu->pc);
  cpu->pc += 4;
  return instr;
}

void cpu_step(CPU *cpu) {
  uint32_t raw = fetch(cpu);
  DecodedInstr instr = decode(raw);
  execute(cpu, &instr);
}