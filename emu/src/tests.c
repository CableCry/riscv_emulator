#include <assert.h>
#include <stdio.h>

#define MEM_TEST
#include "mem.h"

void test_memory() {
  Memory m;
  mem_init(&m);

  mem_write32(&m, 0x00, 0xDEADBEEF);
  assert(mem_read32(&m, 0x00) == 0xDEADBEEF);
  assert(mem_read8(&m, 0x00) == 0xEF);
  assert(mem_read8(&m, 0x01) == 0xBE);
  assert(mem_read16(&m, 0x00) == 0xBEEF);

  mem_free(&m);
  printf("Memory tests passed\n");
}

#define REG_TEST
#include "regs.h"
void test_registers() {
  Registers r;
  regs_init(&r);

  write_reg(&r, 0, 69); // should be ignored
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

int main() {
  test_memory();
  test_registers();
  return 0;
}
