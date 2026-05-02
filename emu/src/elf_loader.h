#ifndef ELF_LOADER_H
#define ELF_LOADER_H

#include "cpu.h"
#include <stdbool.h>

typedef enum {
    ELF_OK              = 0,
    ELF_ERR_OPEN        = 1,  // could not open file
    ELF_ERR_MAGIC       = 2,  // not a valid ELF file
    ELF_ERR_NOT_32BIT   = 3,  // not a 32-bit ELF
    ELF_ERR_NOT_LE      = 4,  // not little endian
    ELF_ERR_NOT_RISCV   = 5,  // not a RISC-V binary
    ELF_ERR_NO_LOAD     = 6,  // no loadable segments found
    ELF_ERR_TOO_BIG     = 7,  // segment too large for memory
} ElfResult;

ElfResult elf_load(CPU *cpu, const char *path);
const char *elf_result_str(ElfResult r);

#ifdef ELF_LOADER_TEST
void test_elf_loader();
#endif

#endif
