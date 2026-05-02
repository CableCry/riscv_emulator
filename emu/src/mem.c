#include "mem.h"
#include "cpu.h"
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

void mem_init(Memory *m) {
    m->data = (uint8_t *)calloc(MEM_SIZE, sizeof(uint8_t));
    m->size = MEM_SIZE;
}

void mem_free(Memory *m) {
    free(m->data);
    m->data = NULL;
    m->size = 0;
}

uint8_t mem_read8(Memory *m, struct CPU *cpu, uint32_t addr) {
    if (addr >= m->size) {
        cpu->trap     = TRAP_LOAD_FAULT;
        cpu->trap_val = addr;
        return 0;
    }
    return m->data[addr];
}

uint16_t mem_read16(Memory *m, struct CPU *cpu, uint32_t addr) {
    if (addr + 1 >= m->size) {
        cpu->trap     = TRAP_LOAD_FAULT;
        cpu->trap_val = addr;
        return 0;
    }
    uint16_t val;
    memcpy(&val, &m->data[addr], sizeof(uint16_t));
    return val;
}

uint32_t mem_read32(Memory *m, struct CPU *cpu, uint32_t addr) {
    if (addr + 3 >= m->size) {
        cpu->trap     = TRAP_LOAD_FAULT;
        cpu->trap_val = addr;
        return 0;
    }
    uint32_t val;
    memcpy(&val, &m->data[addr], sizeof(uint32_t));
    return val;
}

void mem_write8(Memory *m, struct CPU *cpu, uint32_t addr, uint8_t val) {
    if (addr >= m->size) {
        cpu->trap     = TRAP_STORE_FAULT;
        cpu->trap_val = addr;
        return;
    }
    memcpy(&m->data[addr], &val, sizeof(uint8_t));
}

void mem_write16(Memory *m, struct CPU *cpu, uint32_t addr, uint16_t val) {
    if (addr + 1 >= m->size) {
        cpu->trap     = TRAP_STORE_FAULT;
        cpu->trap_val = addr;
        return;
    }
    memcpy(&m->data[addr], &val, sizeof(uint16_t));
}

void mem_write32(Memory *m, struct CPU *cpu, uint32_t addr, uint32_t val) {
    if (addr + 3 >= m->size) {
        cpu->trap     = TRAP_STORE_FAULT;
        cpu->trap_val = addr;
        return;
    }
    memcpy(&m->data[addr], &val, sizeof(uint32_t));
}
