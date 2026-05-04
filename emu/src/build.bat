@echo off
emcc cpu.c decode.c execute.c regs.c elf_loader.c emulator_api.c wasm_api.c ^
  -o emulator.js ^
  -s WASM=1 ^
  -s "EXPORTED_RUNTIME_METHODS=[""ccall"",""cwrap"",""HEAPU32"",""HEAPU8""]" ^
  -s "EXPORTED_FUNCTIONS=[""_wasm_init"",""_wasm_free"",""_wasm_load_elf"",""_wasm_step"",""_wasm_run"",""_wasm_is_halted"",""_wasm_get_reg"",""_wasm_get_pc"",""_wasm_read_mem32"",""_wasm_read_mem8"",""_wasm_get_trap"",""_wasm_get_trap_val"",""_wasm_get_all_regs"",""_wasm_load_bytes"",""_wasm_set_pc"",""_wasm_set_all_regs"",""_wasm_clear_trap"",""_wasm_write_mem8"",""_wasm_write_mem32"",""_malloc"",""_free""]" ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s NO_EXIT_RUNTIME=1 ^
  -s MODULARIZE=1 ^
  -s EXPORT_NAME=createEmulator ^
  -O2