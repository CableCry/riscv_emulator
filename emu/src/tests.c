#include <assert.h>
#include <stdbool.h>
#include <stdio.h>

#define REG_TEST
#include "regs.h"

#define DECODE_TEST
#include "decode.h"

#define EXECUTE_TEST
#include "execute.h"

#define CPU_TEST
#include "cpu.h"

#define ELF_LOADER_TEST
#include "elf_loader.h"

void debug_curr_instr(CPU *cpu);

void test_memory() {
    CPU cpu;
    cpu_init(&cpu);

    mem_write32(&cpu, 0x00, 0xDEADBEEF);
    assert(mem_read32(&cpu, 0x00) == 0xDEADBEEF);
    assert(mem_read8(&cpu, 0x00) == 0xEF);
    assert(mem_read8(&cpu, 0x01) == 0xBE);
    assert(mem_read16(&cpu, 0x00) == 0xBEEF);

    cpu_free(&cpu);
    printf("Memory tests passed\n");
}

void test_registers() {
    Registers r;
    regs_init(&r);

    write_reg(&r, 0, 69);
    assert(read_reg(&r, 0) == 0);

    write_reg(&r, 1, 69);
    assert(read_reg(&r, 1) == 69);

    write_reg(&r, 2, 420);
    assert(read_reg(&r, 2) == 420);

    write_reg(&r, 3, 360);
    assert(read_reg(&r, 3) == 360);

    write_reg(&r, 4, 1024);
    assert(read_reg(&r, 4) == 1024);

    write_reg(&r, 5, 21);
    assert(read_reg(&r, 5) == 21);

    write_reg(&r, 6, 42);
    assert(read_reg(&r, 6) == 42);

    write_reg(&r, 7, 88);
    assert(read_reg(&r, 7) == 88);

    write_reg(&r, 31, 9);
    assert(read_reg(&r, 31) == 9);

    printf("Register tests passed\n");
}

bool decoded_is_equal(DecodedInstr *a, DecodedInstr *b) {
    if (a->opcode != b->opcode) return false;
    if (a->imm    != b->imm)    return false;

    if (a->opcode != 0x23 && a->opcode != 0x63) {
        if (a->rd != b->rd) return false;
    }

    if (a->opcode != 0x37 && a->opcode != 0x17 && a->opcode != 0x6F) {
        if (a->funct3 != b->funct3) return false;
        if (a->rs1    != b->rs1)    return false;
    }

    if (a->opcode == 0x33) {
        if (a->rs2    != b->rs2)    return false;
        if (a->funct7 != b->funct7) return false;
    }

    return true;
}

void test_traps() {
    CPU cpu;
    cpu_init(&cpu);

    // illegal instruction should set trap
    execute(&cpu, &(DecodedInstr){.opcode = 0xFF});
    assert(cpu.trap == TRAP_ILLEGAL_INSTR);
    assert(cpu.trap_val == cpu.pc - 4);

    // cpu_step should halt after trap is set
    cpu_init(&cpu);
    cpu.trap = TRAP_ILLEGAL_INSTR;
    uint32_t pc_before = cpu.pc;
    cpu_step(&cpu);
    assert(cpu.pc == pc_before);

    // ecall should set TRAP_ECALL
    cpu_init(&cpu);
    execute(&cpu, &(DecodedInstr){.opcode = 0x73, .funct3 = 0x0, .imm = 0x0});
    assert(cpu.trap == TRAP_ECALL);

    // ebreak should set TRAP_EBREAK
    cpu_init(&cpu);
    execute(&cpu, &(DecodedInstr){.opcode = 0x73, .funct3 = 0x0, .imm = 0x1});
    assert(cpu.trap == TRAP_EBREAK);

    // trap should be clear after fresh init
    cpu_init(&cpu);
    assert(cpu.trap == TRAP_NONE);

    cpu_free(&cpu);
    printf("Trap tests passed\n");
}

void test_decode() {
    // R-type: ADD x0, x1, x2
    const uint32_t ADD = 0x00208033;
    DecodedInstr ADD_EXPECTED = {.opcode = 0x33, .rd = 0, .funct3 = 0x0,
                                 .rs1 = 1, .rs2 = 2, .funct7 = 0x00, .imm = 0};
    DecodedInstr add_result = decode(ADD);
    assert(decoded_is_equal(&ADD_EXPECTED, &add_result));

    // I-type: ADDI x1, x0, 5
    const uint32_t ADDI = 0x00500093;
    DecodedInstr ADDI_EXPECTED = {.opcode = 0x13, .rd = 1, .funct3 = 0x0,
                                  .rs1 = 0, .rs2 = 0, .funct7 = 0, .imm = 5};
    DecodedInstr addi_result = decode(ADDI);
    assert(decoded_is_equal(&ADDI_EXPECTED, &addi_result));

    // S-type: SW x1, 0(x2)
    const uint32_t SW = 0x00112023;
    DecodedInstr SW_EXPECTED = {.opcode = 0x23, .rd = 0, .funct3 = 0x2,
                                .rs1 = 2, .rs2 = 1, .funct7 = 0, .imm = 0};
    DecodedInstr sw_result = decode(SW);
    assert(decoded_is_equal(&SW_EXPECTED, &sw_result));

    // B-type: BEQ x1, x2, +8
    const uint32_t BEQ = 0x00208463;
    DecodedInstr BEQ_EXPECTED = {.opcode = 0x63, .rd = 0, .funct3 = 0x0,
                                 .rs1 = 1, .rs2 = 2, .funct7 = 0, .imm = 8};
    DecodedInstr beq_result = decode(BEQ);
    assert(decoded_is_equal(&BEQ_EXPECTED, &beq_result));

    // U-type: LUI x1, 0x12
    const uint32_t LUI = 0x000120B7;
    DecodedInstr LUI_EXPECTED = {.opcode = 0x37, .rd = 1, .funct3 = 0,
                                 .rs1 = 0, .rs2 = 0, .funct7 = 0, .imm = 0x12000};
    DecodedInstr lui_result = decode(LUI);
    assert(decoded_is_equal(&LUI_EXPECTED, &lui_result));

    // J-type: JAL x1, +8
    const uint32_t JAL = 0x008000EF;
    DecodedInstr JAL_EXPECTED = {.opcode = 0x6F, .rd = 1, .funct3 = 0,
                                 .rs1 = 0, .rs2 = 0, .funct7 = 0, .imm = 8};
    DecodedInstr jal_result = decode(JAL);
    assert(decoded_is_equal(&JAL_EXPECTED, &jal_result));

    printf("Decode tests passed\n");
}

void test_execute() {
    CPU cpu;
    cpu_init(&cpu);

    // R-type ALU: ADD, SUB, SLL, SLT, SLTU, XOR, SRL, SRA, OR, AND
    write_reg(&cpu.regs, 1, 12);
    write_reg(&cpu.regs, 2, 3);
    write_reg(&cpu.regs, 3, 0x80000000);
    write_reg(&cpu.regs, 4, 1);

    // ADD x5 = x1 + x2 = 12 + 3 = 15
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 5, .funct3 = 0x0,
                                  .rs1 = 1, .rs2 = 2, .funct7 = 0x00, .imm = 0});
    assert(read_reg(&cpu.regs, 5) == 15);

    // SUB x6 = x1 - x2 = 12 - 3 = 9
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 6, .funct3 = 0x0,
                                  .rs1 = 1, .rs2 = 2, .funct7 = 0x20, .imm = 0});
    assert(read_reg(&cpu.regs, 6) == 9);

    // SLL x7 = x2 << x4 = 3 << 1 = 6
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 7, .funct3 = 0x1,
                                  .rs1 = 2, .rs2 = 4, .funct7 = 0x00, .imm = 0});
    assert(read_reg(&cpu.regs, 7) == 6);

    // SLT x8 = (x3 < x4) signed = (0x80000000 < 1) = 1 (negative < positive)
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 8, .funct3 = 0x2,
                                  .rs1 = 3, .rs2 = 4, .funct7 = 0x00, .imm = 0});
    assert(read_reg(&cpu.regs, 8) == 1);

    // SLTU x9 = (x3 < x4) unsigned = (0x80000000 < 1) = 0
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 9, .funct3 = 0x3,
                                  .rs1 = 3, .rs2 = 4, .funct7 = 0x00, .imm = 0});
    assert(read_reg(&cpu.regs, 9) == 0);

    // XOR x10 = x1 ^ x2 = 12 ^ 3 = 15
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 10, .funct3 = 0x4,
                                  .rs1 = 1, .rs2 = 2, .funct7 = 0x00, .imm = 0});
    assert(read_reg(&cpu.regs, 10) == 15);

    // SRL x11 = x1 >> x4 = 12 >> 1 = 6
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 11, .funct3 = 0x5,
                                  .rs1 = 1, .rs2 = 4, .funct7 = 0x00, .imm = 0});
    assert(read_reg(&cpu.regs, 11) == 6);

    // SRA x12 = x3 >> x4 = 0x80000000 >> 1 = 0xC0000000 (sign preserved)
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 12, .funct3 = 0x5,
                                  .rs1 = 3, .rs2 = 4, .funct7 = 0x20, .imm = 0});
    assert(read_reg(&cpu.regs, 12) == 0xC0000000);

    // OR x13 = x1 | x2 = 12 | 3 = 15
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 13, .funct3 = 0x6,
                                  .rs1 = 1, .rs2 = 2, .funct7 = 0x00, .imm = 0});
    assert(read_reg(&cpu.regs, 13) == 15);

    // AND x14 = x1 & x2 = 12 & 3 = 0
    execute(&cpu, &(DecodedInstr){.opcode = 0x33, .rd = 14, .funct3 = 0x7,
                                  .rs1 = 1, .rs2 = 2, .funct7 = 0x00, .imm = 0});
    assert(read_reg(&cpu.regs, 14) == 0);

    // I-type ALU: ADDI, SLLI, SLTI, SLTIU, XORI, SRLI, SRAI, ORI, ANDI

    // ADDI x15 = 0 + 5 = 5
    write_reg(&cpu.regs, 1, 0);
    execute(&cpu, &(DecodedInstr){.opcode = 0x13, .rd = 15, .funct3 = 0x0,
                                  .rs1 = 1, .imm = 5});
    assert(read_reg(&cpu.regs, 15) == 5);

    // SLLI x16 = 1 << 4 = 16
    write_reg(&cpu.regs, 1, 1);
    execute(&cpu, &(DecodedInstr){.opcode = 0x13, .rd = 16, .funct3 = 0x1,
                                  .rs1 = 1, .imm = 4});
    assert(read_reg(&cpu.regs, 16) == 16);

    // SLTI x17 = (0xFFFFFFFF < 0) signed = 1 (-1 < 0)
    write_reg(&cpu.regs, 1, 0xFFFFFFFF);
    execute(&cpu, &(DecodedInstr){.opcode = 0x13, .rd = 17, .funct3 = 0x2,
                                  .rs1 = 1, .imm = 0});
    assert(read_reg(&cpu.regs, 17) == 1);

    // SLTIU x18 = (0 < 1) unsigned = 1
    write_reg(&cpu.regs, 1, 0);
    execute(&cpu, &(DecodedInstr){.opcode = 0x13, .rd = 18, .funct3 = 0x3,
                                  .rs1 = 1, .imm = 1});
    assert(read_reg(&cpu.regs, 18) == 1);

    // XORI x19 = 0xAA ^ 0x55 = 0xFF
    write_reg(&cpu.regs, 1, 0xAA);
    execute(&cpu, &(DecodedInstr){.opcode = 0x13, .rd = 19, .funct3 = 0x4,
                                  .rs1 = 1, .imm = 0x55});
    assert(read_reg(&cpu.regs, 19) == 0xFF);

    // SRLI x20 = 0x80 >> 3 = 0x10
    write_reg(&cpu.regs, 1, 0x80);
    execute(&cpu, &(DecodedInstr){.opcode = 0x13, .rd = 20, .funct3 = 0x5,
                                  .rs1 = 1, .imm = 3});
    assert(read_reg(&cpu.regs, 20) == 0x10);

    // SRAI x21 = 0x80000000 >> 3 = 0xF0000000 (sign extended)
    write_reg(&cpu.regs, 1, 0x80000000);
    execute(&cpu, &(DecodedInstr){.opcode = 0x13, .rd = 21, .funct3 = 0x5,
                                  .rs1 = 1, .imm = 0x403});
    assert(read_reg(&cpu.regs, 21) == 0xF0000000);

    // ORI x22 = 0x50 | 0x0F = 0x5F
    write_reg(&cpu.regs, 1, 0x50);
    execute(&cpu, &(DecodedInstr){.opcode = 0x13, .rd = 22, .funct3 = 0x6,
                                  .rs1 = 1, .imm = 0x0F});
    assert(read_reg(&cpu.regs, 22) == 0x5F);

    // ANDI x23 = 0xF0 & 0x0F = 0x00
    write_reg(&cpu.regs, 1, 0xF0);
    execute(&cpu, &(DecodedInstr){.opcode = 0x13, .rd = 23, .funct3 = 0x7,
                                  .rs1 = 1, .imm = 0x0F});
    assert(read_reg(&cpu.regs, 23) == 0x00);

    // Loads: LB, LH, LW, LBU, LHU
    // memory at 0x100: 01 7F FF 80 (little endian: 0x80FF7F01)
    mem_write32(&cpu, 0x100, 0x80FF7F01);
    write_reg(&cpu.regs, 1, 0x100);

    // LB x24 = mem[0x100 + 0] = 0x01 sign extended = 0x00000001
    execute(&cpu, &(DecodedInstr){.opcode = 0x03, .rd = 24, .funct3 = 0x0,
                                  .rs1 = 1, .imm = 0});
    assert(read_reg(&cpu.regs, 24) == 0x00000001);

    // LB x25 = mem[0x100 + 3] = 0x80 sign extended = 0xFFFFFF80
    execute(&cpu, &(DecodedInstr){.opcode = 0x03, .rd = 25, .funct3 = 0x0,
                                  .rs1 = 1, .imm = 3});
    assert(read_reg(&cpu.regs, 25) == 0xFFFFFF80);

    // LH x26 = mem[0x100 + 2] = 0x80FF sign extended = 0xFFFF80FF
    execute(&cpu, &(DecodedInstr){.opcode = 0x03, .rd = 26, .funct3 = 0x1,
                                  .rs1 = 1, .imm = 2});
    assert(read_reg(&cpu.regs, 26) == 0xFFFF80FF);

    // LW x27 = mem[0x100 + 0] = 0x80FF7F01
    execute(&cpu, &(DecodedInstr){.opcode = 0x03, .rd = 27, .funct3 = 0x2,
                                  .rs1 = 1, .imm = 0});
    assert(read_reg(&cpu.regs, 27) == 0x80FF7F01);

    // LBU x28 = mem[0x100 + 3] = 0x80 zero extended = 0x00000080
    execute(&cpu, &(DecodedInstr){.opcode = 0x03, .rd = 28, .funct3 = 0x4,
                                  .rs1 = 1, .imm = 3});
    assert(read_reg(&cpu.regs, 28) == 0x00000080);

    // LHU x29 = mem[0x100 + 2] = 0x80FF zero extended = 0x000080FF
    execute(&cpu, &(DecodedInstr){.opcode = 0x03, .rd = 29, .funct3 = 0x5,
                                  .rs1 = 1, .imm = 2});
    assert(read_reg(&cpu.regs, 29) == 0x000080FF);

    // Stores: SB, SH, SW
    write_reg(&cpu.regs, 2, 0x200);
    write_reg(&cpu.regs, 3, 0xAABBCCDD);

    // SB mem[0x200 + 1] = low byte of x3 = 0xDD
    execute(&cpu, &(DecodedInstr){.opcode = 0x23, .funct3 = 0x0,
                                  .rs1 = 2, .rs2 = 3, .imm = 1});
    assert(mem_read8(&cpu, 0x201) == 0xDD);

    // SH mem[0x200 + 2] = low halfword of x3 = 0xBEEF
    write_reg(&cpu.regs, 3, 0xBEEF);
    execute(&cpu, &(DecodedInstr){.opcode = 0x23, .funct3 = 0x1,
                                  .rs1 = 2, .rs2 = 3, .imm = 2});
    assert(mem_read16(&cpu, 0x202) == 0xBEEF);

    // SW mem[0x200 + 4] = x3 = 0xCAFEBABE
    write_reg(&cpu.regs, 3, 0xCAFEBABE);
    execute(&cpu, &(DecodedInstr){.opcode = 0x23, .funct3 = 0x2,
                                  .rs1 = 2, .rs2 = 3, .imm = 4});
    assert(mem_read32(&cpu, 0x204) == 0xCAFEBABE);

    // Branches: BEQ, BNE, BLT, BGE, BLTU, BGEU
    write_reg(&cpu.regs, 1, 10);
    write_reg(&cpu.regs, 2, 10);
    write_reg(&cpu.regs, 3, 5);

    // BEQ taken: x1 == x2, pc advances by imm - 4
    cpu.pc = 0x100;
    execute(&cpu, &(DecodedInstr){.opcode = 0x63, .funct3 = 0x0,
                                  .rs1 = 1, .rs2 = 2, .imm = 8});
    assert(cpu.pc == 0x104);

    // BEQ not taken: x1 != x3, pc unchanged
    cpu.pc = 0x100;
    execute(&cpu, &(DecodedInstr){.opcode = 0x63, .funct3 = 0x0,
                                  .rs1 = 1, .rs2 = 3, .imm = 8});
    assert(cpu.pc == 0x100);

    // BNE taken: x1 != x3
    cpu.pc = 0x100;
    execute(&cpu, &(DecodedInstr){.opcode = 0x63, .funct3 = 0x1,
                                  .rs1 = 1, .rs2 = 3, .imm = 8});
    assert(cpu.pc == 0x104);

    // BLT taken: x3 < x1 signed = 5 < 10
    cpu.pc = 0x100;
    execute(&cpu, &(DecodedInstr){.opcode = 0x63, .funct3 = 0x4,
                                  .rs1 = 3, .rs2 = 1, .imm = 8});
    assert(cpu.pc == 0x104);

    // BGE taken: x1 >= x3 = 10 >= 5
    cpu.pc = 0x100;
    execute(&cpu, &(DecodedInstr){.opcode = 0x63, .funct3 = 0x5,
                                  .rs1 = 1, .rs2 = 3, .imm = 8});
    assert(cpu.pc == 0x104);

    // BLTU taken: x3 < x1 unsigned
    cpu.pc = 0x100;
    execute(&cpu, &(DecodedInstr){.opcode = 0x63, .funct3 = 0x6,
                                  .rs1 = 3, .rs2 = 1, .imm = 8});
    assert(cpu.pc == 0x104);

    // BGEU taken: x1 >= x3 unsigned
    cpu.pc = 0x100;
    execute(&cpu, &(DecodedInstr){.opcode = 0x63, .funct3 = 0x7,
                                  .rs1 = 1, .rs2 = 3, .imm = 8});
    assert(cpu.pc == 0x104);

    // LUI x31 = 0x12000
    execute(&cpu, &(DecodedInstr){.opcode = 0x37, .rd = 31, .imm = 0x12000});
    assert(read_reg(&cpu.regs, 31) == 0x12000);

    // AUIPC x29 = pc - 4 + 0x12000
    cpu.pc = 0x100;
    execute(&cpu, &(DecodedInstr){.opcode = 0x17, .rd = 29, .imm = 0x12000});
    assert(read_reg(&cpu.regs, 29) == 0x100 - 4 + 0x12000);

    // JAL x28 = pc, then jump by imm - 4
    cpu.pc = 0x100;
    execute(&cpu, &(DecodedInstr){.opcode = 0x6F, .rd = 28, .imm = 8});
    assert(read_reg(&cpu.regs, 28) == 0x100);
    assert(cpu.pc == 0x104);

    // JALR x27 = pc, then jump to (rs1 + imm) & ~1
    cpu.pc = 0x100;
    write_reg(&cpu.regs, 1, 0x200);
    execute(&cpu, &(DecodedInstr){.opcode = 0x67, .rd = 27, .rs1 = 1, .imm = 4});
    assert(read_reg(&cpu.regs, 27) == 0x100);
    assert(cpu.pc == ((0x200 + 4) & ~1));

    cpu_free(&cpu);
    printf("Execute tests passed\n");
}

void test_elf_loader() {
    CPU cpu;
    cpu_init(&cpu);

    ElfResult result = elf_load(&cpu, "test_program/program.elf");
    assert(result == ELF_OK);
    printf("Entry point: 0x%08X\n", cpu.pc);

    write_reg(&cpu.regs, 2, cpu.mem.size - 4);
    write_reg(&cpu.regs, 1, 0x0);

    int cycles = 0;
    while (cpu.trap == TRAP_NONE && cycles < 10000) {
        cpu_step(&cpu);
        cycles++;
    }

    printf("Cycles: %d\n", cycles);
    printf("Halted at pc=0x%08X trap=%d\n", cpu.pc, cpu.trap);
    printf("x10 (return value): %d\n", read_reg(&cpu.regs, 10));

    if (cpu.trap == TRAP_LOAD_FAULT || cpu.trap == TRAP_MISALIGNED_FETCH)
        printf("main returned cleanly via sentinel\n");

    cpu_free(&cpu);
    printf("ELF tests passed\n");
}

int main() {
    test_memory();
    test_registers();
    test_traps();
    test_decode();
    test_execute();
    test_elf_loader();
    return 0;
}

void debug_curr_instr(CPU *cpu) {
    uint32_t raw = mem_read32(cpu, cpu->pc);
    DecodedInstr d = decode(raw);
    printf("Instr decode: opcode=0x%X rd=%d rs1=%d rs2=%d funct3=0x%X funct7=0x%X\n",
        d.opcode, d.rd, d.rs1, d.rs2, d.funct3, d.funct7);
}
