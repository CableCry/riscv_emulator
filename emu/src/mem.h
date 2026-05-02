#ifndef MEMORY_H
#define MEMORY_H

#include <stdint.h>
#include <stdlib.h>

#define MEM_SIZE (1024 * 1024)

typedef struct {
    uint8_t *data;
    uint32_t size;
} Memory;

// forward declare using struct tag, no typedef
struct CPU;

void mem_init(Memory *m);
void mem_free(Memory *m);

uint8_t  mem_read8 (Memory *m, struct CPU *cpu, uint32_t addr);
uint16_t mem_read16(Memory *m, struct CPU *cpu, uint32_t addr);
uint32_t mem_read32(Memory *m, struct CPU *cpu, uint32_t addr);

void mem_write8 (Memory *m, struct CPU *cpu, uint32_t addr, uint8_t val);
void mem_write16(Memory *m, struct CPU *cpu, uint32_t addr, uint16_t val);
void mem_write32(Memory *m, struct CPU *cpu, uint32_t addr, uint32_t val);

#ifdef MEM_TEST
void test_memory();
#endif

#endif
