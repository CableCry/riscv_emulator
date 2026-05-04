// wasm_api.c
#include "emulator_api.h"
#include <emscripten.h>

// single global CPU instance — the JS side works with this
static CPU cpu;

EMSCRIPTEN_KEEPALIVE
void wasm_init() {
  emu_init(&cpu);
  // set up stack pointer
  write_reg(&cpu.regs, 2, cpu.mem.size - 4);
}

EMSCRIPTEN_KEEPALIVE
void wasm_free() { emu_free(&cpu); }

EMSCRIPTEN_KEEPALIVE
int wasm_load_elf(const char *path) { return emu_load_elf(&cpu, path) ? 1 : 0; }

EMSCRIPTEN_KEEPALIVE
void wasm_step() { emu_step(&cpu); }

EMSCRIPTEN_KEEPALIVE
void wasm_run(int limit) { emu_run(&cpu, limit); }

EMSCRIPTEN_KEEPALIVE
int wasm_is_halted() { return emu_is_halted(&cpu) ? 1 : 0; }

EMSCRIPTEN_KEEPALIVE
uint32_t wasm_get_reg(int reg) { return emu_get_reg(&cpu, reg); }

EMSCRIPTEN_KEEPALIVE
uint32_t wasm_get_pc() { return emu_get_pc(&cpu); }

EMSCRIPTEN_KEEPALIVE
uint32_t wasm_read_mem32(uint32_t addr) { return emu_read_mem32(&cpu, addr); }

EMSCRIPTEN_KEEPALIVE
uint8_t wasm_read_mem8(uint32_t addr) { return emu_read_mem8(&cpu, addr); }

EMSCRIPTEN_KEEPALIVE
int wasm_get_trap() { return emu_get_trap(&cpu); }

EMSCRIPTEN_KEEPALIVE
uint32_t wasm_get_trap_val() { return emu_get_trap_val(&cpu); }

// write all 32 registers into a JS-accessible buffer
EMSCRIPTEN_KEEPALIVE
void wasm_get_all_regs(uint32_t *out) {
  for (int i = 0; i < 32; i++) {
    out[i] = emu_get_reg(&cpu, i);
  }
}

// load raw binary bytes directly into memory (for testing without ELF)
EMSCRIPTEN_KEEPALIVE
void wasm_load_bytes(uint32_t addr, uint8_t *bytes, int len) {
  for (int i = 0; i < len; i++) {
    mem_write8(&cpu, addr + i, bytes[i]);
  }
}

// ── Back-step / history support ──────────────────────────────────────────────

EMSCRIPTEN_KEEPALIVE
void wasm_set_pc(uint32_t pc) { cpu.pc = pc; }

EMSCRIPTEN_KEEPALIVE
void wasm_set_all_regs(uint32_t *regs) {
  for (int i = 0; i < 32; i++)
    write_reg(&cpu.regs, i, regs[i]);
}

EMSCRIPTEN_KEEPALIVE
void wasm_clear_trap() {
  cpu.trap     = TRAP_NONE;
  cpu.trap_val = 0;
}

// ── Inline assembler / breakpoint memory writes ───────────────────────────────

EMSCRIPTEN_KEEPALIVE
void wasm_write_mem8(uint32_t addr, uint8_t val) { mem_write8(&cpu, addr, val); }

EMSCRIPTEN_KEEPALIVE
void wasm_write_mem32(uint32_t addr, uint32_t val) { mem_write32(&cpu, addr, val); }