#include "cpu.h"
#include "decode.h"
#include "execute.h"

void mem_init(Memory *m) {
    m->data = (uint8_t *)calloc(MEM_SIZE, sizeof(uint8_t));
    m->size = MEM_SIZE;
}

void mem_free(Memory *m) {
    free(m->data);
    m->data = NULL;
    m->size = 0;
}

uint8_t mem_read8(CPU *cpu, uint32_t addr) {
    if (addr >= cpu->mem.size) {
        cpu->trap     = TRAP_LOAD_FAULT;
        cpu->trap_val = addr;
        return 0;
    }
    return cpu->mem.data[addr];
}

uint16_t mem_read16(CPU *cpu, uint32_t addr) {
    if (addr + 1 >= cpu->mem.size) {
        cpu->trap     = TRAP_LOAD_FAULT;
        cpu->trap_val = addr;
        return 0;
    }
    uint16_t val;
    memcpy(&val, &cpu->mem.data[addr], sizeof(uint16_t));
    return val;
}

uint32_t mem_read32(CPU *cpu, uint32_t addr) {
    if (addr + 3 >= cpu->mem.size) {
        cpu->trap     = TRAP_LOAD_FAULT;
        cpu->trap_val = addr;
        return 0;
    }
    uint32_t val;
    memcpy(&val, &cpu->mem.data[addr], sizeof(uint32_t));
    return val;
}

void mem_write8(CPU *cpu, uint32_t addr, uint8_t val) {
    if (addr >= cpu->mem.size) {
        cpu->trap     = TRAP_STORE_FAULT;
        cpu->trap_val = addr;
        return;
    }
    memcpy(&cpu->mem.data[addr], &val, sizeof(uint8_t));
}

void mem_write16(CPU *cpu, uint32_t addr, uint16_t val) {
    if (addr + 1 >= cpu->mem.size) {
        cpu->trap     = TRAP_STORE_FAULT;
        cpu->trap_val = addr;
        return;
    }
    memcpy(&cpu->mem.data[addr], &val, sizeof(uint16_t));
}

void mem_write32(CPU *cpu, uint32_t addr, uint32_t val) {
    if (addr + 3 >= cpu->mem.size) {
        cpu->trap     = TRAP_STORE_FAULT;
        cpu->trap_val = addr;
        return;
    }
    memcpy(&cpu->mem.data[addr], &val, sizeof(uint32_t));
}

void cpu_init(CPU *cpu) {
    regs_init(&cpu->regs);
    mem_init(&cpu->mem);
    cpu->pc       = 0;
    cpu->trap     = TRAP_NONE;
    cpu->trap_val = 0;
}

void cpu_free(CPU *cpu) {
    mem_free(&cpu->mem);
    cpu->pc = 0;
}

uint32_t fetch(CPU *cpu) {
    if (cpu->pc >= cpu->mem.size) {
        cpu->trap     = TRAP_MISALIGNED_FETCH;
        cpu->trap_val = cpu->pc;
        return 0;
    }
    uint32_t instr = mem_read32(cpu, cpu->pc);
    cpu->pc += 4;
    return instr;
}

void cpu_step(CPU *cpu) {
    if (cpu->trap != TRAP_NONE) return;
    uint32_t raw  = fetch(cpu);
    if (cpu->trap != TRAP_NONE) return;
    DecodedInstr d = decode(raw);
    execute(cpu, &d);
}
