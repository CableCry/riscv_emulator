#include "emulator_api.h"
#include <string.h>

void emu_init(CPU *cpu) {
    cpu_init(cpu);
}

void emu_free(CPU *cpu) {
    cpu_free(cpu);
}

bool emu_load_elf(CPU *cpu, const char *path) {
    // reset state before loading
    cpu_init(cpu);
    ElfResult r = elf_load(cpu, path);
    return r == ELF_OK;
}

void emu_reset(CPU *cpu) {
    uint32_t sp = cpu->mem.size - 4;  // preserve memory contents
    cpu->pc       = 0;
    cpu->trap     = TRAP_NONE;
    cpu->trap_val = 0;
    regs_init(&cpu->regs);
    write_reg(&cpu->regs, 2, sp);
}

void emu_step(CPU *cpu) {
    cpu_step(cpu);
}

void emu_run(CPU *cpu, int limit) {
    int cycles = 0;
    while (cpu->trap == TRAP_NONE && cycles < limit) {
        cpu_step(cpu);
        cycles++;
    }
}

bool emu_is_halted(CPU *cpu) {
    return cpu->trap != TRAP_NONE;
}

uint32_t emu_get_reg(CPU *cpu, int reg) {
    return read_reg(&cpu->regs, reg);
}

uint32_t emu_get_pc(CPU *cpu) {
    return cpu->pc;
}

uint32_t emu_read_mem32(CPU *cpu, uint32_t addr) {
    return mem_read32(cpu, addr);
}

uint8_t emu_read_mem8(CPU *cpu, uint32_t addr) {
    return mem_read8(cpu, addr);
}

int emu_get_trap(CPU *cpu) {
    return (int)cpu->trap;
}

uint32_t emu_get_trap_val(CPU *cpu) {
    return cpu->trap_val;
}

const char *emu_trap_name(CPU *cpu) {
    switch (cpu->trap) {
        case TRAP_NONE:             return "none";
        case TRAP_ILLEGAL_INSTR:    return "illegal instruction";
        case TRAP_LOAD_FAULT:       return "load fault";
        case TRAP_STORE_FAULT:      return "store fault";
        case TRAP_MISALIGNED_FETCH: return "misaligned fetch";
        case TRAP_ECALL:            return "ecall";
        case TRAP_EBREAK:           return "ebreak";
        default:                    return "unknown";
    }
}