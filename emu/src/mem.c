#include "mem.h"

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

uint8_t mem_read8(Memory *m, uint32_t addr) {
  if (addr >= m->size) {
    return 0xEF;
    // trap(TRAP_LOAD_FAULT, addr);
  }
  return m->data[addr];
}

uint16_t mem_read16(Memory *m, uint32_t addr) {
  if (addr + 1 >= m->size) {
    return 0xBEEF;
    // trap(TRAP_LOAD_FAULT, addr);
  }

  uint16_t val;
  memcpy(&val, &m->data[addr], sizeof(uint16_t));
  return val;
}

uint32_t mem_read32(Memory *m, uint32_t addr) {
  if (addr + 3 >= m->size) {
    return 0xDEADBEEF;
    // trap(TRAP_LOAD_FAULT, addr);
  }

  uint32_t val;
  memcpy(&val, &m->data[addr], sizeof(uint32_t));
  return val;
}

void mem_write8(Memory *m, uint32_t addr, uint8_t val) {
  if (addr >= m->size) {
    // trap(TRAP_LOAD_FAULT, addr);
  }
  memcpy(&m->data[addr], &val, sizeof(uint8_t));
}

void mem_write16(Memory *m, uint32_t addr, uint16_t val) {
  if (addr + 1 >= m->size) {
    // trap(TRAP_LOAD_FAULT, addr);
  }
  memcpy(&m->data[addr], &val, sizeof(uint16_t));
}

void mem_write32(Memory *m, uint32_t addr, uint32_t val) {
  if (addr + 3 >= m->size) {
    // trap(TRAP_LOAD_FAULT, addr);
  }
  memcpy(&m->data[addr], &val, sizeof(uint32_t));
}
