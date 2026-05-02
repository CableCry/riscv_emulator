#include "elf_loader.h"
#include <stdio.h>
#include <stdint.h>
#include <string.h>

// ELF header field offsets (all little-endian uint32 unless noted)
#define ELF_MAGIC       0x464C457F  // 0x7F 'E' 'L' 'F'
#define ELF_CLASS_32    1           // 32-bit
#define ELF_DATA_LE     1           // little endian
#define ELF_MACH_RISCV  0xF3        // RISC-V machine type

// ELF32 header — matches the binary layout exactly
typedef struct {
    uint8_t  e_ident[16];   // magic, class, data, version, OS/ABI
    uint16_t e_type;        // object file type
    uint16_t e_machine;     // target architecture
    uint32_t e_version;     // ELF version
    uint32_t e_entry;       // entry point address
    uint32_t e_phoff;       // program header table offset
    uint32_t e_shoff;       // section header table offset (unused)
    uint32_t e_flags;       // processor flags
    uint16_t e_ehsize;      // ELF header size
    uint16_t e_phentsize;   // program header entry size
    uint16_t e_phnum;       // number of program header entries
    uint16_t e_shentsize;   // section header entry size (unused)
    uint16_t e_shnum;       // number of section header entries (unused)
    uint16_t e_shstrndx;    // section name string table index (unused)
} Elf32_Ehdr;

// ELF32 program header — one per segment
typedef struct {
    uint32_t p_type;    // segment type (PT_LOAD = 1)
    uint32_t p_offset;  // offset of segment data in file
    uint32_t p_vaddr;   // virtual address to load segment at
    uint32_t p_paddr;   // physical address (ignored)
    uint32_t p_filesz;  // size of segment in file
    uint32_t p_memsz;   // size of segment in memory (may be larger due to BSS)
    uint32_t p_flags;   // segment flags (read/write/execute)
    uint32_t p_align;   // alignment (ignored)
} Elf32_Phdr;

#define PT_LOAD 1

ElfResult elf_load(CPU *cpu, const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return ELF_ERR_OPEN;

    Elf32_Ehdr ehdr;
    fread(&ehdr, sizeof(ehdr), 1, f);
    //printf("magic:   0x%08X (expected 0x464C457F)\n", *(uint32_t *)ehdr.e_ident);
    //printf("class:   %d (expected 1 = 32-bit)\n", ehdr.e_ident[4]);
    //printf("data:    %d (expected 2 = little endian)\n", ehdr.e_ident[5]);
    //printf("machine: 0x%02X (expected 0xF3 = RISC-V)\n", ehdr.e_machine);

    if (*(uint32_t *)ehdr.e_ident != ELF_MAGIC) {
        fclose(f);
        return ELF_ERR_MAGIC;
    }

    if (ehdr.e_ident[4] != ELF_CLASS_32) {
        fclose(f);
        return ELF_ERR_NOT_32BIT;
    }

    if (ehdr.e_ident[5] != ELF_DATA_LE) {
        fclose(f);
        return ELF_ERR_NOT_LE;
    }

    if (ehdr.e_machine != ELF_MACH_RISCV) {
        fclose(f);
        return ELF_ERR_NOT_RISCV;
    }

    bool loaded_any = false;

    for (int i = 0; i < ehdr.e_phnum; i++) {
        Elf32_Phdr phdr;

        fseek(f, ehdr.e_phoff + i * sizeof(Elf32_Phdr), SEEK_SET);
        fread(&phdr, sizeof(phdr), 1, f);

        if (phdr.p_type != PT_LOAD) continue;

        if (phdr.p_vaddr + phdr.p_memsz > cpu->mem.size) {
            fclose(f);
            return ELF_ERR_TOO_BIG;
        }

        memset(&cpu->mem.data[phdr.p_vaddr], 0, phdr.p_memsz);

        fseek(f, phdr.p_offset, SEEK_SET);
        fread(&cpu->mem.data[phdr.p_vaddr], phdr.p_filesz, 1, f);

        loaded_any = true;
    }

    fclose(f);

    if (!loaded_any) return ELF_ERR_NO_LOAD;

    cpu->pc = ehdr.e_entry;

    return ELF_OK;
}

const char *elf_result_str(ElfResult r) {
    switch (r) {
        case ELF_OK:            return "OK";
        case ELF_ERR_OPEN:      return "could not open file";
        case ELF_ERR_MAGIC:     return "not a valid ELF file";
        case ELF_ERR_NOT_32BIT: return "not a 32-bit ELF";
        case ELF_ERR_NOT_LE:    return "not little endian";
        case ELF_ERR_NOT_RISCV: return "not a RISC-V binary";
        case ELF_ERR_NO_LOAD:   return "no loadable segments found";
        case ELF_ERR_TOO_BIG:   return "segment too large for memory";
        default:                return "unknown error";
    }
}
