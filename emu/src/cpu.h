#ifndef CPU_H
#define CPU_H

#include "regs.h"
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define MEM_SIZE (1024 * 1024)

typedef enum {
    TRAP_NONE             = 0,
    TRAP_ILLEGAL_INSTR    = 1,
    TRAP_LOAD_FAULT       = 2,
    TRAP_STORE_FAULT      = 3,
    TRAP_MISALIGNED_FETCH = 4,
    TRAP_ECALL            = 5,
    TRAP_EBREAK           = 6,
} TrapCause;

typedef struct {
    uint8_t  *data;
    uint32_t  size;
} Memory;

typedef struct {
    Registers regs;
    uint32_t  pc;
    Memory    mem;
    TrapCause trap;
    uint32_t  trap_val;
} CPU;

void     mem_init   (Memory *m);
void     mem_free   (Memory *m);
uint8_t  mem_read8  (CPU *cpu, uint32_t addr);
uint16_t mem_read16 (CPU *cpu, uint32_t addr);
uint32_t mem_read32 (CPU *cpu, uint32_t addr);
void     mem_write8 (CPU *cpu, uint32_t addr, uint8_t  val);
void     mem_write16(CPU *cpu, uint32_t addr, uint16_t val);
void     mem_write32(CPU *cpu, uint32_t addr, uint32_t val);

void     cpu_init   (CPU *cpu);
void     cpu_free   (CPU *cpu);
uint32_t fetch      (CPU *cpu);
void     cpu_step   (CPU *cpu);

#endif
