#ifndef EMULATOR_API_H
#define EMULATOR_API_H

#include "cpu.h"
#include "elf_loader.h"
#include <stdint.h>
#include <stdbool.h>

void     emu_init       (CPU *cpu);
void     emu_free       (CPU *cpu);
bool     emu_load_elf   (CPU *cpu, const char *path);
void     emu_reset      (CPU *cpu);

void     emu_step       (CPU *cpu);           // execute one instruction
void     emu_run        (CPU *cpu, int limit); // run until trap or limit
bool     emu_is_halted  (CPU *cpu);

uint32_t emu_get_reg    (CPU *cpu, int reg);
uint32_t emu_get_pc     (CPU *cpu);

uint32_t emu_read_mem32 (CPU *cpu, uint32_t addr);
uint8_t  emu_read_mem8  (CPU *cpu, uint32_t addr);

int      emu_get_trap   (CPU *cpu);
uint32_t emu_get_trap_val(CPU *cpu);
const char *emu_trap_name(CPU *cpu);

#endif